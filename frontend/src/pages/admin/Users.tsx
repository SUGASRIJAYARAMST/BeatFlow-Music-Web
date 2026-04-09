import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Search, Crown, User, Trash2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";

interface AdminUser { _id: string; clerkId: string; fullName: string; imageUrl: string; email: string; isPremium: boolean; subscriptionPlan: string; subscriptionExpiry: string | null; role: string; createdAt: string; }

const AdminUsers = () => {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "premium" | "free">("all");
    const [showFilter, setShowFilter] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: "premium" | "delete"; userId: string; currentStatus?: boolean; userName: string; plan?: string; expiryDate?: string } | null>(null);
    const [selectedPlan, setSelectedPlan] = useState("monthly");
    const [expiryDate, setExpiryDate] = useState("");

    const getDefaultExpiry = (plan: string) => {
        const date = new Date();
        if (plan === "daily") date.setDate(date.getDate() + 1);
        else if (plan === "monthly") date.setMonth(date.getMonth() + 1);
        else if (plan === "yearly") date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split("T")[0] ;
    };

    useEffect(() => { fetchUsers(); }, []);
    const fetchUsers = async () => { try { const res = await axiosInstance.get("/admin/users"); setUsers(res.data.users || res.data); } catch (error) { console.error("Failed to fetch users", error); } };
    const deleteUser = async (userId: string, userName: string) => { 
        setConfirmAction({ type: "delete", userId, userName });
        setShowConfirm(true) ;
    };
    const handleTogglePremium = (userId: string, currentStatus: boolean, userName: string) => {
        const plan = "monthly";
        const expiry = getDefaultExpiry(plan);
        setSelectedPlan(plan);
        setExpiryDate(expiry);
        setConfirmAction({ type: "premium", userId, currentStatus, userName, plan, expiryDate: expiry });
        setShowConfirm(true);
    };
    const updateConfirmExpiry = (plan: string) => {
        setSelectedPlan(plan);
        setExpiryDate(getDefaultExpiry(plan));
        setConfirmAction(prev => prev ? { ...prev, plan, expiryDate: getDefaultExpiry(plan) } : null);
    };
    const confirmActionHandler = async () => {
        if (!confirmAction) return;
        if (confirmAction.type === "delete") {
            try { await axiosInstance.delete(`/admin/users/${confirmAction.userId}`); toast.success("User deleted"); fetchUsers(); } catch (error: any) { toast.error(error.response?.data?.message || "Failed to delete user"); }
        } else {
            try { 
                await axiosInstance.put(`/admin/users/${confirmAction.userId}/premium`, { 
                    isPremium: !confirmAction.currentStatus,
                    plan: confirmAction.plan || "monthly",
                    expiryDate: confirmAction.expiryDate
                }); 
                toast.success("User Pro status updated"); 
                fetchUsers(); 
            } catch (error: any) { toast.error(error.response?.data?.message || "Failed to update"); }
        }
        setShowConfirm(false);
        setConfirmAction(null);
    };
    const filtered = users.filter((u) => {
        if (u.role === "admin") return false;
        const matchesSearch = u.fullName.toLowerCase().includes(search.toLowerCase()) || u.clerkId.includes(search);
        const matchesFilter = filter === "all" || (filter === "premium" && u.isPremium) || (filter === "free" && !u.isPremium);
        return matchesSearch && matchesFilter;
    });

    const filterOptions = [
        { value: "all", label: "All Users", color: "text-base-content" },
        { value: "premium", label: "Pro Users", color: "text-emerald-400" },
        { value: "free", label: "Free", color: "text-base-content/60" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Users ({users.length})</h1>
            <div className="flex gap-6 mb-6 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-base-content/60" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-10 bg-base-200/50 border border-emerald-500/10 focus:border-emerald-500/50 text-base-content placeholder:text-base-content/40 hover:border-emerald-500/30 transition-all" />
                </div>
                <div className="relative ml-2">
                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-base-200/50 border border-emerald-500/20 text-base-content rounded-lg hover:border-emerald-500/40 hover:bg-base-200 transition-all cursor-pointer"
                    >
                        <span className={filterOptions.find(o => o.value === filter)?.color}>{filterOptions.find(o => o.value === filter)?.label}</span>
                        <ChevronDown className={`size-4 transition-transform ${showFilter ? "rotate-180" : ""}`} />
                    </button>
                    {showFilter && (
                        <div className="absolute top-full mt-2 -right-2 w-56 bg-base-100/95 backdrop-blur-sm border border-emerald-500/20 rounded-xl shadow-2xl overflow-hidden z-50 p-2">
                            {filterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => { setFilter(option.value as any); setShowFilter(false); }}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all hover:bg-emerald-500/10 ${option.color} ${filter === option.value ? "bg-emerald-500/10 font-semibold" : ""}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="card bg-base-100 shadow-xl rounded-lg overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-base-200 text-sm text-base-content/60">
                            <th className="text-left p-4">User</th>
                            <th className="text-left p-4">Plan</th>
                            <th className="text-left p-4">Status</th>
                            <th className="text-left p-4">Expires</th>
                            <th className="text-left p-4">Joined</th>
                            <th className="text-right p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-base-content/60">No users found</td></tr>
                        ) : filtered.map((user) => (
                            <tr key={user._id} className="border-b border-base-200 hover:bg-violet-500/5">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {user.imageUrl ? (
                                            <img src={user.imageUrl} alt={user.fullName} className="size-8 rounded-full" />
                                        ) : (
                                            <div className="size-8 bg-base-200 rounded-full flex items-center justify-center">
                                                <User className="size-4 text-base-content/60" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">{user.fullName}</p>
                                            <p className="text-xs text-base-content/60">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm">{user.subscriptionPlan}</td>
                                <td className="p-4">
                                    {user.isPremium ? (
                                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400"><Crown className="size-3" /> Pro</span>
                                    ) : (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-base-200 text-base-content/60">Free</span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-base-content/60">{user.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString() : "—"}</td>
                                <td className="p-4 text-sm text-base-content/60">{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleTogglePremium(user._id, user.isPremium, user.fullName)} className="text-xs">
                                            {user.isPremium ? "Remove Pro" : "Make Pro"}
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => deleteUser(user._id, user.fullName)} className="text-xs bg-red-500/10 text-red-400 border border-red-400/20 hover:bg-red-500/20">
                                            <Trash2 className="size-3.5 mr-1" /> Delete
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showConfirm && confirmAction && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
                    <div className="glass-dark rounded-2xl p-6 border border-white/20 shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">{confirmAction.type === "delete" ? "Delete User" : "Make Pro User"}</h3>
                        <p className="text-gray-300 mb-4">
                            {confirmAction.type === "delete" 
                                ? `Are you sure you want to delete "${confirmAction.userName}"? This action cannot be undone.`
                                : `Select plan and expiry date for ${confirmAction.userName}`}
                        </p>
                        
                        {confirmAction.type === "premium" && !confirmAction.currentStatus && (
                            <div className="space-y-3 mb-4">
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Plan</label>
                                    <select 
                                        value={selectedPlan} 
                                        onChange={(e) => updateConfirmExpiry(e.target.value)}
                                        className="w-full bg-base-200 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    >
                                        <option value="daily">Daily (₹1)</option>
                                        <option value="monthly">Monthly (₹29)</option>
                                        <option value="yearly">Yearly (₹99)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-400 block mb-1">Expiry Date</label>
                                    <input 
                                        type="date" 
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="w-full bg-base-200 border border-white/10 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowConfirm(false)} className="flex-1">Cancel</Button>
                            <Button onClick={confirmActionHandler} className={`flex-1 ${confirmAction.type === "delete" ? "bg-red-500 hover:bg-red-400 text-white" : "bg-emerald-500 hover:bg-emerald-400 text-black"}`}>{confirmAction.type === "delete" ? "Delete" : "Confirm"}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
