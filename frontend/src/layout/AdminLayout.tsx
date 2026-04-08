import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useUser, useClerk } from "@clerk/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,  Music,  Disc,  Megaphone,  Users,  CreditCard,  Settings,  LogOut,  KeyRound,  Tag,  Menu,  User,  ArrowRight,  MessageSquare } from "lucide-react";
import { cn } from "../lib/utils";
import { axiosInstance } from "../lib/axios";
import AudioPlayer from "./components/AudioPlayer";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Music, label: "Upload Song", path: "/admin/upload-song" },
  { icon: Disc, label: "Upload Album", path: "/admin/upload-album" },
  { icon: Music, label: "Manage Songs", path: "/admin/songs" },
  { icon: Disc, label: "Manage Albums", path: "/admin/albums" },
  { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: CreditCard, label: "Subscriptions", path: "/admin/subscriptions" },
  { icon: KeyRound, label: "Password Requests", path: "/admin/password-requests" },
  { icon: Tag, label: "Offer", path: "/admin/offer" },
  { icon: MessageSquare, label: "Feedback", path: "/admin/feedback" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
  { icon: LogOut, label: "Back to App", path: "/" },
];

const AdminLayout = () => {
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [pinRequests, setPinRequests] = useState<any[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(new Set());
  const [loadingNotif, setLoadingNotif] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoadingNotif(true);

      const [pinRes, passRes] = await Promise.all([
        axiosInstance.get("/admin/pin-requests"),
        axiosInstance.get("/admin/password-requests"),
      ]);

      const pinData = (pinRes.data || []).filter((r: any) => r._id);
      const passData = (passRes.data || []).filter((r: any) => r._id);

      setPinRequests(pinData);
      setPasswordRequests(passData);

      const allIds = new Set([...pinData.map((r: any) => r._id), ...passData.map((r: any) => r._id)]);
      setSeenRequestIds((prev) => {
        const merged = new Set([...prev, ...allIds]);
        return merged;
      });
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.pathname === "/admin/password-requests") {
      setSeenRequestIds((prev) => {
        const updated = new Set(prev);
        passwordRequests.forEach((r) => updated.add(r._id));
        return updated;
      });
    }
  }, [location.pathname, passwordRequests]);

  const unseenPasswordCount = passwordRequests.filter((r) => !seenRequestIds.has(r._id)).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".menu-container")) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const menuItems = [
    { icon: ArrowRight, label: "Back to App", action: () => navigate("/") },
    { icon: User, label: "Profile", action: () => navigate("/profile") },
    {
      icon: LogOut,
      label: "Sign Out",
      action: () => {
        signOut();
        navigate("/");
      },
    },
  ];

  return (
    <div
      data-theme="forest"
      className="min-h-screen bg-main-gradient text-base-content flex"
    >

        <aside className="w-64 glass-dark border-r border-base-100/10 flex flex-col shrink-0">
          <div className="p-4 border-b border-base-100/10">
            <h1 className="text-xl font-bold text-gradient">BeatFlow Admin</h1>
            <p className="text-sm text-base-content/60 mt-1">
              SUGASRIJAYARAM S T
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-base-content/60 hover:text-base-content hover:bg-base-300"
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
                {item.path === "/admin/password-requests" && unseenPasswordCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unseenPasswordCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-4">
          <div className="flex justify-end mb-4 relative gap-2">
            <div className="menu-container">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="size-10 glass-dark rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 border border-white/5"
              >
                <Menu className="size-5 text-base-content/70" />
              </button>

              {menuOpen && (
                <div className="absolute top-12 right-0 w-48 bg-base-100 rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                  {menuItems.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={item.action}
                      className="w-full p-3 text-left hover:bg-base-300 flex items-center gap-3 border-b border-white/5 last:border-0"
                    >
                      <item.icon className="size-4 text-base-content/70" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
<Outlet />
        </main>
        <AudioPlayer />
      </div>
  );
};

export default AdminLayout;