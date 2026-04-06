import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useUser, useClerk, UserButton } from "@clerk/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,  Music,  Disc,  Megaphone,  Users,  CreditCard,  Settings,  LogOut,  Key,  Tag,  Menu,  User,  ArrowRight,  Bell,Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { axiosInstance } from "../lib/axios";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
  { icon: Music, label: "Upload Song", path: "/admin/upload-song" },
  { icon: Disc, label: "Upload Album", path: "/admin/upload-album" },
  { icon: Music, label: "Manage Songs", path: "/admin/songs" },
  { icon: Disc, label: "Manage Albums", path: "/admin/albums" },
  { icon: Megaphone, label: "Announcements", path: "/admin/announcements" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: CreditCard, label: "Subscriptions", path: "/admin/subscriptions" },
  { icon: Key, label: "Password Requests", path: "/admin/password-requests" },
  { icon: Tag, label: "Offer", path: "/admin/offer" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
  { icon: LogOut, label: "Back to App", path: "/" },
];

const AdminLayout = () => {
  const location = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [pinRequests, setPinRequests] = useState<any[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<any[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(false);

  const dismissNotification = async (id: string, type: "pin" | "password") => {
    try {
      if (type === "pin") {
        await axiosInstance.post(`/admin/pin-requests/${id}/reject`);
        setPinRequests((prev) => prev.filter((r) => r._id !== id));
      } else {
        await axiosInstance.post(`/admin/password-requests/${id}/reject`);
        setPasswordRequests((prev) => prev.filter((r) => r._id !== id));
      }
    } catch (error) {
      console.error("Failed to dismiss notification:", error);
    }
  };

  const clearAllNotifications = () => {
    setPinRequests([]);
    setPasswordRequests([]);
  };

  const fetchRequests = async () => {
    try {
      setLoadingNotif(true);

      const [pinRes, passRes] = await Promise.all([
        axiosInstance.get("/admin/pin-requests"),
        axiosInstance.get("/admin/password-requests"),
      ]);

      setPinRequests((pinRes.data || []).filter((r: any) => r._id));
      setPasswordRequests((passRes.data || []).filter((r: any) => r._id));
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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      if (!target.closest(".notif-container")) {
        setNotifOpen(false);
      }

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

  const totalRequests = pinRequests.length + passwordRequests.length;

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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-base-content/60 hover:text-base-content hover:bg-base-300"
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-auto p-4">
          <div className="flex justify-end mb-4 relative gap-2">
            {/* <button
              onClick={(e) => {
                e.stopPropagation();
                setNotifOpen(!notifOpen);
              }}
              className="notif-container size-10 glass-dark rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 border border-white/5 relative"
            >
              <Bell className="size-5 text-base-content/70" />
              {totalRequests > 0 && (
                <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {totalRequests}
                </span>
              )}
            </button> */}

            {notifOpen && (
              <div className="notif-container absolute top-12 right-0 w-72 bg-base-100 rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <p className="font-semibold">Notifications</p>

                  {totalRequests > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearAllNotifications();
                      }}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {[...pinRequests, ...passwordRequests].map((req: any) => (
                    <div
                      key={req._id}
                      className="w-full p-3 text-left hover:bg-base-300 border-b border-white/5 flex items-start gap-3"
                    >
                      <Key className="size-4 text-yellow-500 mt-0.5" />

                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate("/admin/password-requests")}
                      >
                        <p className="font-medium text-sm truncate">
                          {req.fullName}
                        </p>
                        <p className="text-xs text-base-content/60 truncate">
                          {req.email}
                        </p>
                      </div>

                      <button
                        onClick={() =>
                          dismissNotification(
                            req._id,
                            pinRequests.find((p) => p._id === req._id)
                              ? "pin"
                              : "password"
                          )
                        }
                        className="ml-auto p-1 rounded hover:bg-white/5 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
         
      </div>
  );
};

export default AdminLayout;