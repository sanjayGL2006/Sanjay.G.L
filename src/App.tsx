import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, Navigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { jsPDF } from "jspdf";
import { 
  Plus, 
  List, 
  Share2, 
  Download, 
  CheckCircle2, 
  Clock, 
  Search, 
  ArrowLeft,
  User,
  Phone,
  IndianRupee,
  Flower2,
  ShieldCheck,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  Users,
  Calendar,
  TrendingUp,
  Trash2,
  Unlock,
  AlertCircle,
  X
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

// Types
interface Donation {
  id: string;
  donorName: string;
  mobile: string;
  amount: string;
  poojaType: string;
  collector: string;
  status: "Pending" | "Paid";
  date: string;
}

interface Config {
  templeName: string;
  templeAddress: string;
  upiId: string;
  logoUrl?: string;
}

// Auth Context / State
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
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setToken(null);
    setUser(null);
  };

  return { token, user, login, logout, isAuthenticated: !!token };
};

interface UserData {
  id: string;
  username: string;
  role: "admin" | "user";
  email: string;
  failed_attempts: number;
  locked_until: string | null;
}

// Components
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
        src={config.logoUrl || "https://picsum.photos/seed/god1/200/200"} 
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
        src={config.logoUrl || "https://picsum.photos/seed/god2/200/200"} 
        alt="Logo Right" 
        className="w-20 h-20 md:w-32 md:h-32 object-cover rounded-full border-4 border-white/20 shadow-lg"
        referrerPolicy="no-referrer"
      />
    </div>
  </header>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
        >
          <h3 className="text-2xl font-serif mb-4">{title}</h3>
          <p className="text-temple-olive/70 mb-8">{message}</p>
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 p-4 rounded-2xl bg-temple-bg font-bold">Cancel</button>
            <button onClick={onConfirm} className="flex-1 p-4 rounded-2xl bg-red-500 text-white font-bold">Confirm</button>
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
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
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
        navigate(data.user.role === "admin" ? "/admin" : "/");
      } else {
        setError(data.error || "Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) setMessage(data.message);
      else setError(data.error);
    } catch (e) { setError("Failed to process request."); }
    finally { setLoading(false); }
  };

  if (showForgot) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto p-6 mt-12">
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-black/5">
          <button onClick={() => setShowForgot(false)} className="mb-4 text-temple-olive flex items-center gap-2"><ArrowLeft size={16}/> Back</button>
          <h2 className="text-3xl font-serif mb-6 text-temple-olive">Forgot Password</h2>
          {message ? <p className="text-green-600 mb-4">{message}</p> : (
            <form onSubmit={handleForgot} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm uppercase font-bold text-temple-olive/70">Email Address</label>
                <input required type="email" className="w-full bg-temple-bg/50 rounded-2xl p-4" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button disabled={loading} className="w-full bg-temple-olive text-white rounded-2xl p-5 font-bold">Send Reset Link</button>
            </form>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto p-6 mt-12">
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-black/5">
        <div className="flex justify-center mb-6">
          <div className="p-1 bg-temple-olive/10 rounded-full overflow-hidden w-24 h-24 border-2 border-temple-olive/20">
            <img 
              src={config.logoUrl || "https://picsum.photos/seed/temple-logo/200/200"} 
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
            <label className="text-sm uppercase font-bold text-temple-olive/70">Username</label>
            <input required className="w-full bg-temple-bg/50 border-none rounded-2xl p-4" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm uppercase font-bold text-temple-olive/70">Password</label>
            <div className="relative">
              <input required type={showPassword ? "text" : "password"} className="w-full bg-temple-bg/50 border-none rounded-2xl p-4 pr-12" value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-temple-olive/40">{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button>
            </div>
          </div>
          <button disabled={loading} className="w-full bg-temple-olive text-white rounded-2xl p-5 font-bold shadow-lg shadow-temple-olive/20">{loading ? "Logging in..." : "Login"}</button>
          <button type="button" onClick={() => setShowForgot(true)} className="w-full text-center text-sm text-temple-olive/60 hover:underline">Forgot Password?</button>
        </form>
      </div>
    </motion.div>
  );
};

const DonationForm = ({ config, onAdd, user }: { config: Config; onAdd: (d: Donation) => void, user: any }) => {
  const [formData, setFormData] = useState({
    donor: "",
    mobile: "",
    amount: "",
    poojaType: "Archana",
  });
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
        body: JSON.stringify(formData)
      });
      const newDonation = await res.json();
      onAdd(newDonation);
      navigate(`/receipt/${newDonation.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto p-6"
    >
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
        <h2 className="text-3xl font-serif mb-6 text-center text-temple-olive">New Donation Receipt</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
              <User size={14} /> Donor
            </label>
            <input 
              required
              className="w-full bg-temple-bg/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-temple-olive/20 transition-all font-sans"
              value={formData.donor}
              onChange={e => setFormData({...formData, donor: e.target.value})}
              placeholder="Full Name"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <Phone size={14} /> Mobile Number
              </label>
              <input 
                required
                type="tel"
                className="w-full bg-temple-bg/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-temple-olive/20 transition-all font-sans"
                value={formData.mobile}
                onChange={e => setFormData({...formData, mobile: e.target.value})}
                placeholder="10-digit mobile"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
                <IndianRupee size={14} /> Amount
              </label>
              <input 
                required
                type="number"
                className="w-full bg-temple-bg/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-temple-olive/20 transition-all font-sans"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                placeholder="₹ 0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm uppercase tracking-wider font-sans font-semibold text-temple-olive/70 flex items-center gap-2">
              <Flower2 size={14} /> Select Puja Type
            </label>
            <select 
              className="w-full bg-temple-bg/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-temple-olive/20 transition-all font-sans"
              value={formData.poojaType}
              onChange={e => setFormData({...formData, poojaType: e.target.value})}
            >
              <option>Archana</option>
              <option>Abhishekam</option>
              <option>Deeparadhana</option>
              <option>Annadanam</option>
              <option>Special Pooja</option>
            </select>
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

  const [copying, setCopying] = useState(false);
  const [utr, setUtr] = useState("");

  const copyUpiId = () => {
    navigator.clipboard.writeText(config.upiId);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `*Donation Receipt - ${config.templeName}*\n\nDonor: ${(donation as any).donor}\nAmount: ₹${donation.amount}\nPooja: ${donation.poojaType}\nStatus: ${donation.status}\nReceipt ID: ${donation.id}`;
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
        ["Donor Name", (donation as any).donor],
        ["Mobile", donation.mobile],
        ["Pooja Type", donation.poojaType],
        ["Amount", `Rs. ${donation.amount}`],
        ["Collector", donation.collector],
        ["Status", donation.status]
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
      doc.line(20, pageHeight - 40, 190, pageHeight - 40);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(39, 174, 96);
      doc.text("Thank you for your generous donation!", 105, pageHeight - 30, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(127, 140, 141);
      doc.text("For any queries, please contact the temple office.", 105, pageHeight - 22, { align: "center" });
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
          <div className={`px-4 py-1 rounded-full text-sm font-sans font-bold ${donation.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {donation.status}
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
            <span className="font-bold">{(donation as any).donor}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-serif">Amount</span>
            <span className="font-bold text-2xl text-temple-olive">₹ {donation.amount}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span className="font-serif">Pooja Type</span>
            <span className="font-bold">{donation.poojaType}</span>
          </div>
        </div>

        {donation.status === "Pending" && (
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
                imageSettings={{
                  src: "https://cdn-icons-png.flaticon.com/512/4336/4336531.png",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>

            <div className="mt-6 w-full space-y-4">
              <div className="flex items-center justify-between bg-temple-bg/50 p-3 rounded-xl border border-black/5">
                <span className="text-xs font-mono text-temple-olive/60 truncate max-w-[180px]">{config.upiId}</span>
                <button 
                  onClick={copyUpiId}
                  className="text-xs font-sans font-bold text-temple-olive hover:text-temple-ink flex items-center gap-1"
                >
                  {copying ? "Copied!" : "Copy ID"}
                </button>
              </div>

              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="Enter Bank Ref / UTR (Optional)"
                  className="w-full bg-white border border-black/10 rounded-xl p-3 text-sm font-sans focus:ring-2 focus:ring-temple-olive/20 outline-none"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                />
                <button 
                  onClick={() => onUpdateStatus(donation.id, "Paid")}
                  className="w-full flex items-center justify-center gap-2 bg-temple-olive text-white p-4 rounded-xl font-sans font-bold hover:opacity-90 transition-all shadow-md"
                >
                  <CheckCircle2 size={18} /> Confirm Payment Received
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 bg-[#25D366] text-white p-4 rounded-2xl font-sans font-bold hover:opacity-90 transition-all"
          >
            <Share2 size={18} /> WhatsApp
          </button>
          <button 
            onClick={downloadPDF}
            className="flex items-center justify-center gap-2 bg-temple-olive text-white p-4 rounded-2xl font-sans font-bold hover:opacity-90 transition-all"
          >
            <Download size={18} /> Download PDF
          </button>
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
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<"user" | "donation">("user");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/stats`, { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()).then(setStats);
    if (user.role === "admin") {
      fetch(`/api/users`, { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()).then(setUsers);
    }
  }, [user.role, donations]);

  const filtered = donations.filter(d => {
    const matchesSearch = (d as any).donor?.toLowerCase().includes(searchTerm.toLowerCase()) || d.mobile.includes(searchTerm) || d.id.includes(searchTerm);
    if (!startDate || !endDate) return matchesSearch;
    const dDate = new Date(d.date);
    return matchesSearch && dDate >= new Date(startDate) && dDate <= new Date(endDate);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const endpoint = deleteType === "user" ? `/api/users/${deleteId}` : `/api/donations/${deleteId}`;
    await fetch(endpoint, { 
      method: "DELETE", 
      headers: { "Authorization": `Bearer ${localStorage.getItem("admin_token")}` } 
    });
    if (deleteType === "user") {
      setUsers(users.filter(u => u.id !== deleteId));
    } else {
      // Refresh stats and donations list
      const token = localStorage.getItem("admin_token");
      fetch(`/api/stats`, { headers: { "Authorization": `Bearer ${token}` } }).then(res => res.json()).then(setStats);
      // We don't have a direct way to filter the donations prop since it's passed from parent,
      // but the parent will re-fetch on next render or we can just hope for the best.
      // Actually, we should probably handle this in the parent.
      window.location.reload(); // Simple way to refresh everything
    }
    setDeleteId(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pb-32">
      <ConfirmationModal 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete} 
        title={`Delete ${deleteType === "user" ? "User" : "Donation"}`} 
        message={`Are you sure you want to delete this ${deleteType === "user" ? "user" : "donation record"}? This action cannot be undone.`}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-4xl font-serif text-temple-olive">{user.role === "admin" ? "Admin Dashboard" : "My Collections"}</h2>
          <button onClick={onLogout} className="p-2 text-temple-olive/40 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && (
            <button onClick={() => setShowUserMgmt(!showUserMgmt)} className="flex items-center gap-2 bg-temple-olive/10 text-temple-olive px-4 py-2 rounded-xl font-bold">
              <Users size={18}/> {showUserMgmt ? "View Donations" : "Manage Users"}
            </button>
          )}
        </div>
      </div>

      {!showUserMgmt ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex items-center gap-4">
              <div className="p-4 bg-temple-olive/10 rounded-2xl text-temple-olive"><TrendingUp size={24}/></div>
              <div>
                <p className="text-xs uppercase font-bold text-temple-olive/40">Total Collected</p>
                <p className="text-2xl font-bold">₹ {stats?.totalAmount || 0}</p>
              </div>
            </div>
            {user.role === "admin" && stats?.memberStats?.map((m: any) => (
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
            <div className="flex flex-col md:flex-row gap-4">
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

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase font-bold text-temple-olive/40 border-b border-black/5">
                    <th className="p-4">Receipt #</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Donor</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Puja</th>
                    {user.role === "admin" && <th className="p-4">Collector</th>}
                    <th className="p-4">Status</th>
                    {user.role === "admin" && <th className="p-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filtered.map(d => (
                    <tr key={d.id} className="text-sm">
                      <td className="p-4 font-mono text-xs">{d.id}</td>
                      <td className="p-4">{format(new Date(d.date), "MMM d")}</td>
                      <td className="p-4">
                        <div className="font-bold">{(d as any).donor}</div>
                        <div className="text-[10px] text-temple-olive/40">{d.mobile}</div>
                      </td>
                      <td className="p-4 font-bold">₹ {d.amount}</td>
                      <td className="p-4">{d.poojaType}</td>
                      {user.role === "admin" && <td className="p-4 italic text-temple-olive/60">{d.collector}</td>}
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${d.status === "Paid" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {d.status}
                        </span>
                      </td>
                      {user.role === "admin" && (
                        <td className="p-4">
                          <button 
                            onClick={() => {
                              setDeleteType("donation");
                              setDeleteId(d.id);
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <UserCreator onCreated={(u) => setUsers([...users, u])} />
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
                      {u.locked_until && (
                        <button onClick={async () => {
                          await fetch(`/api/users/${u.id}/unlock`, { method: "POST", headers: { "Authorization": `Bearer ${localStorage.getItem("admin_token")}` } });
                          setUsers(users.map(usr => usr.id === u.id ? { ...usr, locked_until: null, failed_attempts: 0 } : usr));
                        }} className="p-2 bg-green-100 text-green-600 rounded-lg"><Unlock size={16}/></button>
                      )}
                      {u.username !== user.username && (
                        <button onClick={() => {
                          setDeleteType("user");
                          setDeleteId(u.id);
                        }} className="p-2 bg-red-100 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const UserCreator = ({ onCreated }: { onCreated: (u: UserData) => void }) => {
  const [form, setForm] = useState({ username: "", password: "", role: "user", email: "" });
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
      onCreated(await res.json());
      setForm({ username: "", password: "", role: "user", email: "" });
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-black/5">
      <h3 className="text-2xl font-serif mb-6">Create New Member</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
        <button disabled={loading} className="bg-temple-olive text-white p-3 rounded-xl font-bold">Create Member</button>
      </form>
    </div>
  );
};

// Main App
export default function App() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [config, setConfig] = useState<Config>({
    templeName: "Sri Mahalakshmi Temple",
    templeAddress: "123 Temple Road, Heritage City",
    upiId: "temple@upi"
  });
  const { token, user, login, logout, isAuthenticated } = useAuth();

  useEffect(() => {
    fetch("/api/config").then(res => res.json()).then(setConfig);
    if (isAuthenticated) {
      fetch("/api/donations", {
        headers: { "Authorization": `Bearer ${token}` }
      })
      .then(res => {
        if (res.status === 401) {
          logout();
          return [];
        }
        return res.json();
      })
      .then(setDonations);
    }
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
      <div className="min-h-screen pb-24">
        <Header config={config} user={user} onLogout={logout} />
        
        <main className="container mx-auto mt-[-3rem] relative z-10 px-4">
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
            <List size={20} />
            <span className="text-[10px] uppercase tracking-widest font-bold">Records</span>
          </Link>
        </nav>
      </div>
    </Router>
  );
}
