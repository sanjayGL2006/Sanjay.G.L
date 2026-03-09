import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Database Initialization
const db = new Database("temple.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT, -- 'admin' or 'user'
    failed_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    donor TEXT,
    mobile TEXT,
    amount REAL,
    poojaType TEXT,
    collector TEXT,
    collector_id TEXT,
    status TEXT,
    date DATETIME,
    utr TEXT
  );
`);

// Seed initial admin if not exists
const seedAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin'").get();
if (!seedAdmin) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)").run(
    "admin-1", "admin", hashedPassword, "admin", "admin@temple.com"
  );
}

// Auth Middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const [userId, role] = Buffer.from(token, "base64").toString().split(":");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    
    (req as any).user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// API Routes
app.get("/api/config", (req, res) => {
  res.json({
    templeName: process.env.TEMPLE_NAME || "Sri Mariyamma Temple",
    templeAddress: process.env.TEMPLE_ADDRESS || "WHX7+3H2, Medarkeri, 3rd Cross Rd, Vinobha Nagar, Shivamogga, Karnataka 577204",
    upiId: process.env.UPI_ID || "temple@upi",
    logoUrl: process.env.LOGO_URL || "",
  });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(403).json({ error: "Account locked. Please contact admin." });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (isValid) {
    // Reset failed attempts
    db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").run(user.id);
    const token = Buffer.from(`${user.id}:${user.role}`).toString("base64");
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } else {
    const newAttempts = user.failed_attempts + 1;
    if (newAttempts >= 3) {
      // Lock for 24 hours or until admin unlocks
      const lockDate = new Date();
      lockDate.setHours(lockDate.getHours() + 24);
      db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").run(newAttempts, lockDate.toISOString(), user.id);
      return res.status(403).json({ error: "Account locked after 3 failed attempts." });
    } else {
      db.prepare("UPDATE users SET failed_attempts = ? WHERE id = ?").run(newAttempts, user.id);
      return res.status(401).json({ error: `Invalid credentials. ${3 - newAttempts} attempts remaining.` });
    }
  }
});

app.post("/api/forgot-password", (req, res) => {
  const { email } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (user) {
    // In a real app, send email. Here we just return success.
    res.json({ message: "Password reset instructions sent to your email." });
  } else {
    res.status(404).json({ error: "Email not found." });
  }
});

// User Management (Admin only)
app.get("/api/users", authenticate, (req, res) => {
  if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const users = db.prepare("SELECT id, username, role, email, failed_attempts, locked_until FROM users").all();
  res.json(users);
});

app.post("/api/users", authenticate, (req, res) => {
  if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { username, password, role, email } = req.body;
  const id = Math.random().toString(36).substr(2, 9);
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)").run(id, username, hashedPassword, role, email);
    res.status(201).json({ id, username, role, email });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.delete("/api/users/:id", authenticate, (req, res) => {
  if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.post("/api/users/:id/unlock", authenticate, (req, res) => {
  if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Donation Routes
app.get("/api/donations", authenticate, (req, res) => {
  const { startDate, endDate } = req.query;
  const user = (req as any).user;
  
  let query = "SELECT * FROM donations";
  const params: any[] = [];

  if (user.role !== "admin") {
    query += " WHERE collector_id = ?";
    params.push(user.id);
  }

  if (startDate && endDate) {
    query += (user.role === "admin" ? " WHERE" : " AND") + " date BETWEEN ? AND ?";
    params.push(startDate, endDate);
  }

  query += " ORDER BY date DESC";
  
  const donations = db.prepare(query).all(...params);
  res.json(donations);
});

app.get("/api/stats", authenticate, (req, res) => {
  const user = (req as any).user;
  
  const totalAmount = db.prepare("SELECT SUM(amount) as total FROM donations" + (user.role === "admin" ? "" : " WHERE collector_id = ?")).get(user.role === "admin" ? [] : [user.id]) as any;
  
  let memberStats = [];
  if (user.role === "admin") {
    memberStats = db.prepare(`
      SELECT u.username as collector, SUM(d.amount) as total, COUNT(d.id) as count
      FROM users u
      LEFT JOIN donations d ON u.id = d.collector_id
      GROUP BY u.id
    `).all();
  }

  res.json({
    totalAmount: totalAmount.total || 0,
    memberStats
  });
});

app.post("/api/donations", (req, res) => {
  const authHeader = req.headers.authorization;
  let user = null;
  
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    try {
      const [userId] = Buffer.from(token, "base64").toString().split(":");
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    } catch (e) {}
  }

  const donation = {
    id: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...req.body,
    collector: user ? user.username : "Counter",
    collector_id: user ? user.id : "public",
    date: new Date().toISOString(),
    status: "Pending",
  };

  db.prepare(`
    INSERT INTO donations (id, donor, mobile, amount, poojaType, collector, collector_id, status, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(donation.id, donation.donor, donation.mobile, donation.amount, donation.poojaType, donation.collector, donation.collector_id, donation.status, donation.date);
  
  res.status(201).json(donation);
});

app.delete("/api/donations/:id", authenticate, (req, res) => {
  if ((req as any).user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  db.prepare("DELETE FROM donations WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.patch("/api/donations/:id/status", authenticate, (req, res) => {
  const { status, utr } = req.body;
  db.prepare("UPDATE donations SET status = ?, utr = ? WHERE id = ?").run(status, utr || null, req.params.id);
  res.json({ success: true });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
