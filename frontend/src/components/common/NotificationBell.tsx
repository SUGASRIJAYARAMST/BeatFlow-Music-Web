import { useState, useRef, useEffect } from "react";
import { Bell, X, Trash2, Music, Heart, ListMusic, AlertCircle, CheckCircle } from "lucide-react";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { axiosInstance } from "../../lib/axios";

const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const notifications = useNotificationStore((state) => state.notifications);
    const enabled = useNotificationStore((state) => state.enabled);
    const fetchNotifications = useNotificationStore((state) => state.fetchNotifications);
    const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
    const clearNotifications = useNotificationStore((state) => state.clearNotifications);
    const removeNotification = useNotificationStore((state) => state.removeNotification);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const unreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => {
        if (enabled) {
            fetchNotifications();
        }
    }, [enabled, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleWheel = (e: WheelEvent) => {
            if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
                return; // Don't close when scrolling inside
            }
            setIsOpen(false); // Close when scrolling outside
        };
        
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.addEventListener("wheel", handleWheel, { passive: true });
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.removeEventListener("wheel", handleWheel);
        };
    }, [isOpen]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "success":
                return <CheckCircle className="size-4 text-emerald-400" />;
            case "error":
                return <AlertCircle className="size-4 text-red-400" />;
            default:
                return <Bell className="size-4 text-blue-400" />;
        }
    };

    const getTypeStyles = (type: string) => {
        switch (type) {
            case "success":
                return "border-l-emerald-500";
            case "error":
                return "border-l-red-500";
            case "warning":
                return "border-l-yellow-500";
            default:
                return "border-l-blue-500";
        }
    };

    if (!enabled) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount > 0) {
                        markAllAsRead();
                    }
                }}
                className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
            >
                <Bell className="size-5 text-base-content/70" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 size-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="fixed md:absolute right-4 md:right-0 top-12 md:top-full w-[calc(100vw-2rem)] md:w-80 max-h-96 bg-base-200 rounded-xl shadow-2xl border border-white/10 overflow-hidden" style={{ zIndex: 99999 }}>
                    <div className="flex items-center justify-between p-3 border-b border-white/10">
                        <span className="font-bold text-sm">Notifications</span>
                        {notifications.length > 0 && (
                            <button
                                onClick={clearNotifications}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                            >
                                <Trash2 className="size-3" /> Clear all
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto max-h-80">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                                <Bell className="size-8 mx-auto text-base-content/30 mb-2" />
                                <p className="text-sm text-base-content/50">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
{notifications.map((notification) => {
                                     // Check if this is a password change related notification and user is admin
                                     const isPasswordChangeNotification = 
                                         notification.title.includes("Password Change Request") ||
                                         notification.title === "Password Change Approved" ||
                                         notification.title === "Password Change Rejected";
                                          
                                     const handleNotificationClick = async () => {
                                         console.log("Notification clicked:", notification.title, "isPasswordChange:", isPasswordChangeNotification);
                                         // If it's a password change notification, navigate to admin password requests page
                                         if (isPasswordChangeNotification) {
                                             try {
                                                 console.log("Navigating to admin password requests page");
                                                 // Navigate to admin password requests page
                                                 navigate("/admin/password-requests");
                                                 // Mark notification as read but don't remove it
                                                 await axiosInstance.put(`/notifications/${notification.id}/read`);
                                                 // Update local state using the notification store
                                                 useNotificationStore.setState(prev => ({
                                                     notifications: prev.notifications.map(n =>
                                                         n.id === notification.id ? { ...n, read: true } : n
                                                     )
                                                 }));
                                             } catch (error) {
                                                 console.error("Failed to handle notification click", error);
                                                 // Fallback to removing notification if navigation fails
                                                 removeNotification(notification.id);
                                             }
                                         } else {
                                             console.log("Not a password change notification, removing as before");
                                             // For non-password change notifications, just remove as before
                                             removeNotification(notification.id);
                                         }
                                     };
                                      
                                     return (
                                         <div
                                             key={notification.id}
                                             className={cn(
                                                 "p-3 hover:bg-white/5 transition-colors border-l-2 bg-base-200",
                                                 getTypeStyles(notification.type),
                                                 !notification.read && "bg-white/5"
                                             )}
                                             onClick={handleNotificationClick}
                                         >
                                             <div className="flex items-start gap-3">
                                                 <div className="mt-0.5">{getIcon(notification.type)}</div>
                                                 <div className="flex-1 min-w-0">
                                                     <p className="text-sm font-medium text-base-content/90">
                                                         {notification.title}
                                                     </p>
                                                     <p className="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                                                         {notification.message}
                                                     </p>
                                                     <p className="text-[10px] text-base-content/40 mt-1">
                                                         {formatTime(notification.createdAt)}
                                                     </p>
                                                 </div>
                                             </div>
                                             <button 
                                                 onClick={(e) => {
                                                     e.stopPropagation(); // Prevent triggering the notification click handler
                                                     removeNotification(notification.id);
                                                 }}
                                                 className="text-base-content/40 hover:text-red-500 transition-colors p-1 rounded hover:bg-white/5 ml-2 flex-shrink-0"
                                             >
                                                 <Trash2 className="size-5" />
                                             </button>
                                         </div>
                                     );
                                 })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
