import React, { useState, useEffect, useMemo } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams, 
  Navigate 
} from "react-router-dom";
import { 
  Plus, 
  List, 
  Users, 
  TrendingUp, 
  Download, 
  LogOut, 
  Search, 
  Calendar, 
  Trash2, 
  Lock, 
  Unlock, 
  User, 
  ShieldCheck, 
  AlertCircle, 
  ArrowLeft, 
  Share2, 
  Instagram, 
  History, 
  Trash,
  Eye,
  EyeOff,
  CreditCard,
  Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { QRCodeSVG } from "qrcode.react";

// --- Types ---
interface Config {
  templeName: string;
  templeAddress: string;
  upiId: string;
  logoUrl: string;
  instagram: string;
}

interface Donation {
  id: string;
  donor: string;
  mobile: string;
  amount: number;
  poojaType: string;
  paymentMode: string;
  collector: string;
  collector_id: string;
  status: string;
  date: string;
  created_at: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  mobile: string;
  role: string;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

interface Log {
  id: number;
  username: string;
  action: string;
  timestamp: string;
}

interface BinItem {
  id: number;
  original_table: string;
  data: string;
  deleted_at: string;
}

// --- Auth Hook ---
const useAuth = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [user, setUser] = useState<any>(JSON.parse(localStorage.getItem("admin_user") || "null"));

  const login = (newToken: string, newUser: any) => {
    localStorage.setItem("admin_token", newToken);
    localStorage.setItem("admin_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    fetch("/api/logout", { headers: { "Authorization": `Bearer ${token}` }, method: "POST" });
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout, isAuthenticated: !!token };
};

// --- Components ---

const Header = ({ config, user, onLogout }: { config: Config, user: any, onLogout: () => void }) => (
  <header className="relative w-full h-72 overflow-hidden rounded-b-[3rem] shadow-xl bg-temple-olive">
    <div className="absolute top-6 right-6 z-10 flex gap-2">
      {user ? (
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-white/60">Logged in as</p>
            <p className="text-sm font-bold text-white">{user.username}</p>
          </div>
          <button onClick={onLogout} className="p-2 text-white/60 hover:text-white transition-colors"><LogOut size={18} /></button>
        </div>
      ) : (
        <Link to="/login" className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/20 text-white font-bold hover:bg-white/20 transition-all">
          Login
        </Link>
      )}
    </div>
    <div className="absolute inset-0 flex justify-between items-center px-4 md:px-12">
      <motion.img 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={config.logoUrl} 
        alt="Logo Left" 
        className="w-20 h-20 md:w-32 md:h-32 object-cover rounded-full border-4 border-white/20 shadow-lg"
        referrerPolicy="no-referrer"
      />
      <div className="flex-1 text-center text-white px-4">
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl md:text-5xl font-bold mb-2 font-serif"
        >
          {config.templeName}
        </motion.h1>
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm md:text-base opacity-90 italic max-w-lg mx-auto"
        >
          {config.templeAddress}
        </motion.p>
      </div>
      <motion.img 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={config.logoUrl} 
        alt="Logo Right" 
        className="w-20 h-20 md:w-32 md:h-32 object-cover rounded-full border-4 border-white/20 shadow-lg"
        referrerPolicy="no-referrer"
      />
    </div>
  </header>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: any) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        >
          <h3 className="text-2xl font-serif mb-4">{title}</h3>
          <p className="text-temple-olive/60 mb-8">{message}</p>
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold bg-temple-bg text-temple-olive">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white">Delete</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const LoginPage = ({ onLogin, config }: { onLogin: (token: string, user: any) => void, config: Config }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token, data.user);
        navigate("/");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto p-6 mt-12">
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-black/5">
        <div className="flex justify-center mb-6">
          <div className="p-1 bg-temple-olive/10 rounded-full overflow-hidden w-24 h-24 border-2 border-temple-olive/20">
            <img 
              src={config.logoUrl} 
              alt="Temple Logo" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
        <h2 className="text-3xl font-serif mb-6 text-center text-temple-olive">Temple Login</h2>
        {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-sm mb-4 flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5"/>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-temple-olive/40 ml-2">Username</label>
            <input 
              required
              className="w-full bg-temple-bg/50 rounded-2xl p-4 font-sans focus:ring-2 ring-temple-olive/20 outline-none transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-temple-olive/40 ml-2">Password</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"}
                className="w-full bg-temple-bg/50 rounded-2xl p-4 font-sans focus:ring-2 ring-temple-olive/20 outline-none transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-temple-olive/40"
              >
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
          </div>
          <button 
            disabled={loading}
            className="w-full bg-temple-olive text-white rounded-2xl p-4 font-sans font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const DonationForm = ({ config, onAdd, user }: { config: Config, onAdd: (d: Donation) => void, user: any }) => {
  const [form, setForm] = useState({ donor: "", mobile: "", amount: "", poojaType: "Archana", paymentMode: "Cash" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("admin_token")}`
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        onAdd(data);
        navigate(`/receipt/${data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-black/5">
        <h2 className="text-4xl font-serif mb-8 text-center text-temple-olive">Generate Receipt</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <User size={14} /> Donor Name
              </label>
              <input 
                required
                className="w-full bg-temple-bg/50 rounded-2xl p-4 font-sans focus:ring-2 ring-temple-olive/20 outline-none transition-all"
                value={form.donor}
                onChange={e => setForm({...form, donor: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <Share2 size={14} /> Mobile Number
              </label>
              <input 
                required
                type="tel"
                className="w-full bg-temple-bg/50 rounded-2xl p-4 font-sans focus:ring-2 ring-temple-olive/20 outline-none transition-all"
                value={form.mobile}
                onChange={e => setForm({...form, mobile: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <TrendingUp size={14} /> Pooja Type
              </label>
              <select 
                className="w-full bg-temple-bg/50 rounded-2xl p-4 font-sans focus:ring-2 ring-temple-olive/20 outline-none transition-all appearance-none"
                value={form.poojaType}
                onChange={e => setForm({...form, poojaType: e.target.value})}
              >
                <option>Archana</option>
                <option>Abhishekam</option>
                <option>Deepotsava</option>
                <option>Anna Prasada</option>
                <option>Special Pooja</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                ₹ Amount
              </label>
              <input 
                required
                type="number"
                className="w-full bg-temple-bg/50 rounded-2xl p-4 font-sans focus:ring-2 ring-temple-olive/20 outline-none transition-all"
                value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <CreditCard size={14} /> Payment Mode
              </label>
              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setForm({...form, paymentMode: "Cash"})}
                  className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${form.paymentMode === "Cash" ? "bg-temple-olive text-white shadow-lg" : "bg-temple-bg text-temple-olive"}`}
                >
                  <Banknote size={18}/> Cash
                </button>
                <button 
                  type="button"
                  onClick={() => setForm({...form, paymentMode: "Online"})}
                  className={`flex-1 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${form.paymentMode === "Online" ? "bg-temple-olive text-white shadow-lg" : "bg-temple-bg text-temple-olive"}`}
                >
                  <CreditCard size={18}/> Online
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <ShieldCheck size={14} /> Collector Name
              </label>
              <input 
                readOnly
                className="w-full bg-temple-bg/20 border-none rounded-2xl p-4 font-sans text-temple-olive/60"
                value={user?.username || "Counter"}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-temple-olive text-white rounded-2xl p-5 font-sans font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-temple-olive/20"
          >
            {loading ? "Generating Receipt..." : "Generate Receipt"}
          </button>
        </form>
      </div>
    </motion.div>
  );
};

const ReceiptView = ({ donations, config, onUpdateStatus }: { donations: Donation[]; config: Config; onUpdateStatus: (id: string, s: string) => void }) => {
  const { id } = useParams();
  const donation = donations.find(d => d.id === id);
  const navigate = useNavigate();

  if (!donation) return <div className="p-10 text-center">Receipt not found</div>;

  const upiUrl = `upi://pay?pa=${config.upiId}&pn=${encodeURIComponent(config.templeName)}&am=${donation.amount}&cu=INR&tn=Donation-${donation.id}&tr=${donation.id}`;

  const shareWhatsApp = () => {
    const text = `*Donation Receipt - ${config.templeName}*\n\nDonor: ${donation.donor}\nAmount: ₹${donation.amount}\nPooja: ${donation.poojaType}\nMode: ${donation.paymentMode}\nReceipt ID: ${donation.id}\n\nFollow us on Instagram: ${config.instagram}`;
    window.open(`https://wa.me/91${donation.mobile}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const downloadPDF = async () => {
    const doc = new jsPDF();
    
    // Helper to get base64 image
    const getBase64Image = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = reject;
        img.src = url;
      });
    };

    try {
      // Add Logo
      if (config.logoUrl) {
        try {
          const logoBase64 = await getBase64Image(config.logoUrl);
          doc.addImage(logoBase64, "PNG", 85, 10, 40, 40);
        } catch (e) {
          console.warn("Could not add logo to PDF", e);
        }
      }

      const startY = config.logoUrl ? 60 : 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(44, 62, 80);
      doc.text(config.templeName, 105, startY, { align: "center" });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(127, 140, 141);
      doc.text(config.templeAddress, 105, startY + 8, { align: "center" });
      
      doc.setDrawColor(189, 195, 199);
      doc.line(20, startY + 15, 190, startY + 15);
      
      // Content
      doc.setFontSize(12);
      doc.setTextColor(44, 62, 80);
      
      const contentY = startY + 30;
      doc.setFont("helvetica", "bold");
      doc.text("Receipt Details", 20, contentY);
      doc.setFont("helvetica", "normal");
      
      const details = [
        ["Receipt ID", donation.id],
        ["Date", format(new Date(donation.date), "PPP")],
        ["Donor Name", donation.donor],
        ["Mobile", donation.mobile],
        ["Pooja Type", donation.poojaType],
        ["Payment Mode", donation.paymentMode],
        ["Amount", `Rs. ${donation.amount}`],
        ["Collector", donation.collector]
      ];

      details.forEach((detail, index) => {
        const y = contentY + 15 + (index * 10);
        doc.setFont("helvetica", "bold");
        doc.text(`${detail[0]}:`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.text(detail[1], 60, y);
      });

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setDrawColor(189, 195, 199);
      doc.line(20, pageHeight - 50, 190, pageHeight - 50);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(39, 174, 96);
      doc.text("Thank you for your generous donation!", 105, pageHeight - 40, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(127, 140, 141);
      doc.text("Follow us on Instagram: " + config.instagram, 105, pageHeight - 32, { align: "center" });
      doc.text("For any queries, please contact the temple office.", 105, pageHeight - 24, { align: "center" });
      doc.text(`UPI ID: ${config.upiId}`, 105, pageHeight - 16, { align: "center" });

      doc.save(`Receipt-${donation.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="max-w-xl mx-auto p-6"
    >
      <div className="bg-white rounded-[2rem] p-8 shadow-2xl border border-black/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-temple-olive"></div>
        
        <div className="flex justify-between items-start mb-8">
          <button onClick={() => navigate("/")} className="p-2 hover:bg-temple-bg rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="px-4 py-1 rounded-full text-sm font-sans font-bold bg-green-100 text-green-700">
            Paid
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-4xl font-serif mb-2">{config.templeName}</h2>
          <p className="text-temple-olive/60 text-sm italic">{config.templeAddress}</p>
        </div>

        <div className="space-y-4 mb-8 bg-temple-bg/30 p-6 rounded-3xl border border-dashed border-temple-olive/20">
          <div className="flex justify-between text-sm uppercase tracking-widest text-temple-olive/60">
            <span>Receipt No</span>
            <span className="font-bold text-temple-ink">{donation.id}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-serif">Donor</span>
            <span className="font-bold">{donation.donor}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-serif">Amount</span>
            <span className="font-bold text-2xl text-temple-olive">₹ {donation.amount}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-serif">Pooja Type</span>
            <span className="font-bold">{donation.poojaType}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-serif">Mode</span>
            <span className="font-bold">{donation.paymentMode}</span>
          </div>
        </div>

        {donation.paymentMode === "Online" && (
          <div className="flex flex-col items-center mb-8 p-6 bg-white rounded-3xl border-2 border-temple-olive/10 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="text-green-600" size={16} />
              <p className="text-sm font-sans font-bold text-temple-olive uppercase tracking-widest">Secure UPI Payment</p>
            </div>
            
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-black/5">
              <QRCodeSVG 
                value={upiUrl} 
                size={200} 
                level="H" 
                includeMargin={true}
              />
            </div>
            <p className="mt-4 font-mono text-xs text-temple-olive/40">{config.upiId}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button 
            onClick={shareWhatsApp}
            className="w-full bg-[#25D366] text-white rounded-2xl p-4 font-sans font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20"
          >
            <Share2 size={20} /> Share via WhatsApp
          </button>
          <button 
            onClick={downloadPDF}
            className="w-full bg-temple-olive text-white rounded-2xl p-4 font-sans font-bold flex items-center justify-center gap-2 shadow-lg shadow-temple-olive/20"
          >
            <Download size={20} /> Download PDF
          </button>
          <a 
            href={config.instagram}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-2xl p-4 font-sans font-bold flex items-center justify-center gap-2 shadow-lg"
          >
            <Instagram size={20} /> Follow on Instagram
          </a>
        </div>
      </div>
    </motion.div>
  );
};

const AdminDashboard = ({ donations, onLogout, user }: { donations: Donation[]; onLogout: () => void, user: any }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [bin, setBin] = useState<BinItem[]>([]);
  const [view, setView] = useState<"donations" | "users" | "logs" | "bin">("donations");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"user" | "donation">("user");

  const token = localStorage.getItem("admin_token");

  const fetchData = async () => {
    try {
      const headers = { "Authorization": `Bearer ${token}` };
      const [statsRes, usersRes, logsRes, binRes] = await Promise.all([
        fetch("/api/stats", { headers }).then(r => r.json()),
        user.role === "admin" ? fetch("/api/users", { headers }).then(r => r.json()) : Promise.resolve([]),
        user.role === "admin" ? fetch("/api/logs", { headers }).then(r => r.json()) : Promise.resolve([]),
        user.role === "admin" ? fetch("/api/bin", { headers }).then(r => r.json()) : Promise.resolve([])
      ]);
      setStats(statsRes);
      setUsers(usersRes);
      setLogs(logsRes);
      setBin(binRes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.role, donations]);

  const filtered = donations.filter(d => {
    const matchesSearch = d.donor?.toLowerCase().includes(searchTerm.toLowerCase()) || d.mobile.includes(searchTerm) || d.id.includes(searchTerm);
    if (!startDate || !endDate) return matchesSearch;
    const dDate = new Date(d.date);
    return matchesSearch && dDate >= new Date(startDate) && dDate <= new Date(endDate);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const endpoint = deleteType === "user" ? `/api/users/${deleteId}` : `/api/donations/${deleteId}`;
    await fetch(endpoint, { 
      method: "DELETE", 
      headers: { "Authorization": `Bearer ${token}` } 
    });
    fetchData();
    if (deleteType === "donation") window.location.reload(); // Refresh parent state
    setDeleteId(null);
  };

  const bulkExport = () => {
    const doc = new jsPDF();
    doc.text("Donation Report", 105, 10, { align: "center" });
    const tableData = filtered.map(d => [
      d.id,
      format(new Date(d.date), "MMM d, yyyy"),
      d.donor,
      d.mobile,
      d.poojaType,
      d.paymentMode,
      d.amount,
      d.collector
    ]);
    (doc as any).autoTable({
      head: [["ID", "Date", "Donor", "Mobile", "Pooja", "Mode", "Amount", "Collector"]],
      body: tableData,
      startY: 20
    });
    doc.save("Donation-Report.pdf");
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-32">
      <ConfirmationModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete} 
        title={`Delete ${deleteType === "user" ? "User" : "Donation"}`} 
        message={`Are you sure you want to delete this ${deleteType === "user" ? "user" : "donation record"}? This action will move it to the Bin.`}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-serif text-temple-olive">{user.role === "admin" ? "Admin Dashboard" : "My Collections"}</h2>
          <button onClick={onLogout} className="p-2 text-temple-olive/40 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setView("donations")} className={`px-4 py-2 rounded-xl font-bold transition-all ${view === "donations" ? "bg-temple-olive text-white" : "bg-temple-olive/10 text-temple-olive"}`}>Records</button>
          {user.role === "admin" && (
            <>
              <button onClick={() => setView("users")} className={`px-4 py-2 rounded-xl font-bold transition-all ${view === "users" ? "bg-temple-olive text-white" : "bg-temple-olive/10 text-temple-olive"}`}>Members</button>
              <button onClick={() => setView("logs")} className={`px-4 py-2 rounded-xl font-bold transition-all ${view === "logs" ? "bg-temple-olive text-white" : "bg-temple-olive/10 text-temple-olive"}`}><History size={18}/></button>
              <button onClick={() => setView("bin")} className={`px-4 py-2 rounded-xl font-bold transition-all ${view === "bin" ? "bg-temple-olive text-white" : "bg-temple-olive/10 text-temple-olive"}`}><Trash size={18}/></button>
            </>
          )}
        </div>
      </div>

      {view === "donations" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex items-center gap-4">
              <div className="p-4 bg-temple-olive/10 rounded-2xl text-temple-olive"><TrendingUp size={24}/></div>
              <div>
                <p className="text-xs uppercase font-bold text-temple-olive/40">Total Collected</p>
                <p className="text-2xl font-bold">₹ {stats?.totalAmount || 0}</p>
              </div>
            </div>
            {user.role === "admin" && stats?.memberStats?.slice(0, 2).map((m: any) => (
              <div key={m.collector} className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex items-center gap-4">
                <div className="p-4 bg-temple-olive/10 rounded-2xl text-temple-olive"><User size={24}/></div>
                <div>
                  <p className="text-xs uppercase font-bold text-temple-olive/40">{m.collector}</p>
                  <p className="text-2xl font-bold">₹ {m.total || 0}</p>
                  <p className="text-[10px] text-temple-olive/40">{m.count} Receipts</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex flex-col md:flex-row gap-4 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-olive/40" size={18} />
                  <input className="w-full bg-temple-bg/50 rounded-xl p-3 pl-12" placeholder="Search donor, mobile, receipt..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2 items-center">
                  <Calendar size={18} className="text-temple-olive/40"/>
                  <input type="date" className="bg-temple-bg/50 rounded-xl p-3 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className="text-temple-olive/40">to</span>
                  <input type="date" className="bg-temple-bg/50 rounded-xl p-3 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <button onClick={bulkExport} className="bg-temple-olive text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <Download size={18}/> Export Report
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase font-bold text-temple-olive/40 border-b border-black/5">
                    <th className="p-4">Receipt #</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Donor</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Puja</th>
                    <th className="p-4">Mode</th>
                    {user.role === "admin" && <th className="p-4">Collector</th>}
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map(d => (
                    <tr key={d.id} className="text-sm">
                      <td className="p-4 font-mono text-xs">{d.id}</td>
                      <td className="p-4">{format(new Date(d.date), "MMM d")}</td>
                      <td className="p-4">
                        <div className="font-bold">{d.donor}</div>
                        <div className="text-[10px] text-temple-olive/40">{d.mobile}</div>
                      </td>
                      <td className="p-4 font-bold">₹ {d.amount}</td>
                      <td className="p-4">{d.poojaType}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${d.paymentMode === "Cash" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {d.paymentMode}
                        </span>
                      </td>
                      {user.role === "admin" && <td className="p-4 italic text-temple-olive/60">{d.collector}</td>}
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Link to={`/receipt/${d.id}`} className="p-2 text-temple-olive hover:bg-temple-bg rounded-lg transition-colors"><Eye size={16}/></Link>
                          {user.role === "admin" && (
                            <button onClick={() => { setDeleteType("donation"); setDeleteId(d.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {view === "users" && (
        <div className="space-y-6">
          <UserCreator onCreated={fetchData} />
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-temple-bg/50 text-xs uppercase font-bold text-temple-olive/40">
                  <th className="p-6">Username</th>
                  <th className="p-6">Role</th>
                  <th className="p-6">Email</th>
                  <th className="p-6">Status</th>
                  <th className="p-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="p-6 font-bold">{u.username}</td>
                    <td className="p-6 uppercase text-xs font-bold">{u.role}</td>
                    <td className="p-6">{u.email}</td>
                    <td className="p-6">
                      {u.locked_until ? <span className="text-red-500 flex items-center gap-1"><Lock size={12}/> Locked</span> : <span className="text-green-500">Active</span>}
                    </td>
                    <td className="p-6 flex gap-2">
                      {u.username !== user.username && (
                        <button onClick={() => { setDeleteType("user"); setDeleteId(u.id); }} className="p-2 bg-red-100 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === "logs" && (
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-temple-bg/50 text-xs uppercase font-bold text-temple-olive/40">
                <th className="p-6">User</th>
                <th className="p-6">Action</th>
                <th className="p-6">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="p-6 font-bold">{l.username}</td>
                  <td className="p-6 uppercase text-xs font-bold">{l.action}</td>
                  <td className="p-6 text-temple-olive/60">{format(new Date(l.timestamp), "PPP p")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === "bin" && (
        <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-black/5">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-temple-bg/50 text-xs uppercase font-bold text-temple-olive/40">
                <th className="p-6">Type</th>
                <th className="p-6">Data</th>
                <th className="p-6">Deleted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {bin.map(b => (
                <tr key={b.id}>
                  <td className="p-6 font-bold uppercase text-xs">{b.original_table}</td>
                  <td className="p-6 font-mono text-[10px] max-w-xs truncate">{b.data}</td>
                  <td className="p-6 text-temple-olive/60">{format(new Date(b.deleted_at), "PPP p")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const UserCreator = ({ onCreated }: { onCreated: () => void }) => {
  const [form, setForm] = useState({ username: "", password: "", role: "user", email: "", mobile: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("admin_token")}` },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      onCreated();
      setForm({ username: "", password: "", role: "user", email: "", mobile: "" });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
      <h3 className="text-xl font-serif mb-6">Create New Member</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-temple-olive/40">Username</label>
          <input required className="w-full bg-temple-bg/50 rounded-xl p-3" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-temple-olive/40">Password</label>
          <input required type="password" className="w-full bg-temple-bg/50 rounded-xl p-3" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-temple-olive/40">Email</label>
          <input required type="email" className="w-full bg-temple-bg/50 rounded-xl p-3" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-temple-olive/40">Mobile</label>
          <input required type="tel" className="w-full bg-temple-bg/50 rounded-xl p-3" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
        </div>
        <button disabled={loading} className="bg-temple-olive text-white p-3 rounded-xl font-bold">Create Member</button>
      </form>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [config, setConfig] = useState<Config>({
    templeName: "Sri Mariyamma Temple",
    templeAddress: "WHX7+3H2, Medarkeri, 3rd Cross Rd, Vinobha Nagar, Shivamogga, Karnataka 577204",
    upiId: "temple@upi",
    logoUrl: "https://picsum.photos/seed/temple-logo/200/200",
    instagram: "https://www.instagram.com/mariamma_trust?igsh=Y3k0Y3ExZHpzdXl0"
  });
  const { token, user, login, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    fetch("/api/config").then(res => res.json()).then(setConfig);
    const headers = isAuthenticated ? { "Authorization": `Bearer ${token}` } : {};
    fetch("/api/donations", { headers }).then(res => res.json()).then(setDonations);
  }, [isAuthenticated, token]);

  const handleAddDonation = (d: Donation) => {
    setDonations(prev => [d, ...prev]);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/donations/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      setDonations(prev => prev.map(d => d.id === id ? { ...d, status: status as any } : d));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-temple-bg text-temple-ink font-sans selection:bg-temple-olive/20">
        <Header config={config} user={user} onLogout={logout} />
        
        <main className="relative -mt-12 z-10">
          <Routes>
            <Route path="/" element={<DonationForm config={config} onAdd={handleAddDonation} user={user} />} />
            <Route path="/receipt/:id" element={<ReceiptView donations={donations} config={config} onUpdateStatus={handleUpdateStatus} />} />
            <Route path="/login" element={<LoginPage onLogin={login} config={config} />} />
            <Route 
              path="/admin" 
              element={isAuthenticated ? <AdminDashboard donations={donations} onLogout={logout} user={user} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>

        <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-temple-olive text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 z-50">
          <Link to="/" className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity">
            <Plus size={20} />
            <span className="text-[10px] uppercase tracking-widest font-bold">New</span>
          </Link>
          <div className="w-px h-6 bg-white/20"></div>
          <Link to="/admin" className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity">
            <TrendingUp size={20} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Records</span>
          </Link>
        </nav>
      </div>
    </Router>
  );
}
