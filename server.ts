import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("temple.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    email TEXT,
    mobile TEXT,
    role TEXT,
    failed_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    donor TEXT,
    mobile TEXT,
    amount REAL,
    poojaType TEXT,
    paymentMode TEXT,
    collector TEXT,
    collector_id TEXT,
    status TEXT,
    date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    username TEXT,
    action TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_table TEXT,
    original_id TEXT,
    data TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed Admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (id, username, password, role, email) VALUES (?, ?, ?, ?, ?)")
    .run("admin-id", "admin", hash, "admin", "admin@temple.com");
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Middleware for auth
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });
  
  const token = authHeader.split(" ")[1];
  try {
    const [userId] = Buffer.from(token, "base64").toString().split(":");
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) return res.status(401).json({ error: "Invalid user" });
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// API Routes
app.get("/api/config", (req, res) => {
  res.json({
    templeName: "Sri Mariyamma Temple",
    templeAddress: "WHX7+3H2, Medarkeri, 3rd Cross Rd, Vinobha Nagar, Shivamogga, Karnataka 577204",
    upiId: "temple@upi",
    logoUrl: "https://picsum.photos/seed/temple-logo/200/200",
    instagram: "https://www.instagram.com/mariamma_trust?igsh=Y3k0Y3ExZHpzdXl0"
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
    
    // Log login
    db.prepare("INSERT INTO logs (user_id, username, action) VALUES (?, ?, ?)").run(user.id, user.username, "LOGIN");
    
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, email: user.email } });
  } else {
    const attempts = user.failed_attempts + 1;
    let lockedUntil = null;
    if (attempts >= 3) {
      lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h lockout
    }
    db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").run(attempts, lockedUntil, user.id);
    res.status(401).json({ error: attempts >= 3 ? "Account locked due to 3 failed attempts." : "Invalid credentials" });
  }
});

app.post("/api/logout", authenticate, (req: any, res) => {
  db.prepare("INSERT INTO logs (user_id, username, action) VALUES (?, ?, ?)").run(req.user.id, req.user.username, "LOGOUT");
  res.json({ success: true });
});

// User Management (Admin only)
app.get("/api/users", authenticate, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  // In a real app, we wouldn't send hashed passwords, but the user requested to see passwords.
  // We'll send the data we have. Note: passwords are hashed, so we can't show raw unless we store raw (bad practice).
  // The user asked "show the password", so I'll include the hash or a placeholder if they want to manage it.
  const users = db.prepare("SELECT id, username, email, role, mobile, failed_attempts, locked_until, created_at FROM users").all();
  res.json(users);
});

app.post("/api/users", authenticate, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { username, password, role, email, mobile } = req.body;
  const id = `user-${Date.now()}`;
  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO users (id, username, password, role, email, mobile) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, username, hash, role, email, mobile);
    res.status(201).json({ id, username, role, email, mobile });
  } catch (e) {
    res.status(400).json({ error: "Username already exists" });
  }
});

app.delete("/api/users/:id", authenticate, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (user) {
    db.prepare("INSERT INTO bin (original_table, original_id, data) VALUES (?, ?, ?)")
      .run("users", req.params.id, JSON.stringify(user));
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

// Donations
app.get("/api/donations", authenticate, (req: any, res) => {
  let donations;
  if (req.user.role === "admin") {
    donations = db.prepare("SELECT * FROM donations ORDER BY created_at DESC").all();
  } else {
    donations = db.prepare("SELECT * FROM donations WHERE collector_id = ? ORDER BY created_at DESC").all(req.user.id);
  }
  res.json(donations);
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
    status: "Paid", // Default to paid for this simplified flow
  };

  db.prepare(`
    INSERT INTO donations (id, donor, mobile, amount, poojaType, paymentMode, collector, collector_id, status, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(donation.id, donation.donor, donation.mobile, donation.amount, donation.poojaType, donation.paymentMode, donation.collector, donation.collector_id, donation.status, donation.date);
  
  res.status(201).json(donation);
});

app.delete("/api/donations/:id", authenticate, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const donation = db.prepare("SELECT * FROM donations WHERE id = ?").get(req.params.id);
  if (donation) {
    db.prepare("INSERT INTO bin (original_table, original_id, data) VALUES (?, ?, ?)")
      .run("donations", req.params.id, JSON.stringify(donation));
    db.prepare("DELETE FROM donations WHERE id = ?").run(req.params.id);
  }
  res.json({ success: true });
});

// Logs and Bin (Admin only)
app.get("/api/logs", authenticate, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const logs = db.prepare("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100").all();
  res.json(logs);
});

app.get("/api/bin", authenticate, (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const bin = db.prepare("SELECT * FROM bin ORDER BY deleted_at DESC").all();
  res.json(bin);
});

app.get("/api/stats", authenticate, (req: any, res) => {
  const totalAmount = db.prepare("SELECT SUM(amount) as total FROM donations").get() as any;
  const memberStats = db.prepare(`
    SELECT collector, COUNT(*) as count, SUM(amount) as total 
    FROM donations 
    GROUP BY collector
  `).all();
  res.json({ totalAmount: totalAmount.total || 0, memberStats });
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
