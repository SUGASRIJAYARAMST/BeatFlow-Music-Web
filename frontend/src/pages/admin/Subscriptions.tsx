import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { CreditCard, TrendingUp, Users, QrCode, Check, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface Payment {
    _id: string;
    clerkId: string;
    plan: string;
    amount: number;
    status: string;
    cashfreeOrderId: string;
    createdAt: string;
    paymentMethod?: string;
    paymentProof?: string;
    userName?: string;
    userEmail?: string;
}

interface Subscriber {
    _id: string;
    fullName: string;
    clerkId: string;
    subscriptionPlan: string;
    subscriptionExpiry: string | null;
    isPremium: boolean;
    role: string;
}

const AdminSubscriptions = () => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [pendingQrPayments, setPendingQrPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            const res = await axiosInstance.get("/admin/subscriptions");
            setPayments(res.data.subscriptions);
            setSubscribers(res.data.activeSubscribers);
            const revenue = res.data.subscriptions
                .filter((p: Payment) => p.status === "success")
                .reduce((sum: number, p: Payment) => sum + p.amount, 0);
            setTotalRevenue(revenue);
        } catch (error) {
            console.error("Failed to fetch subscriptions", error);
        }
    };

    const fetchPendingQrPayments = async () => {
        try {
            const res = await axiosInstance.get("/admin/qr-payments");
            setPendingQrPayments(res.data);
        } catch (error) {
            console.error("Failed to fetch QR payments", error);
        }
    };

    useEffect(() => {
        fetchPendingQrPayments();
    }, []);

    const handleVerifyQrPayment = async (paymentId: string, action: "approve" | "reject") => {
        setLoading(true);
        try {
            await axiosInstance.post(`/admin/qr-payments/${paymentId}/verify`, { action });
            toast.success(action === "approve" ? "Payment approved!" : "Payment rejected");
            fetchPendingQrPayments();
            fetchSubscriptions();
        } catch (error) {
            toast.error("Failed to verify payment");
        } finally {
            setLoading(false);
        }
    };

    const statusColors: Record<string, string> = {
        success: "bg-emerald-500/10 text-emerald-400",
        pending: "bg-yellow-500/10 text-yellow-400",
        failed: "bg-red-500/10 text-red-400",
    };

    return (
        <div>
            <h1 className='text-2xl font-bold mb-6'>Subscriptions</h1>

            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8'>
                <div className='card bg-base-200 rounded-lg p-6 border border-base-100'>
                    <div className='flex items-center gap-3 mb-2'>
                        <div className='p-2 rounded-lg bg-emerald-500/10'>
                            <CreditCard className='size-5 text-emerald-400' />
                        </div>
                        <span className='text-sm text-base-content/60'>Total Revenue</span>
                    </div>
                    <p className='text-2xl font-bold'>₹{totalRevenue}</p>
                </div>
                <div className='card bg-base-200 rounded-lg p-6 border border-base-100'>
                    <div className='flex items-center gap-3 mb-2'>
                        <div className='p-2 rounded-lg bg-blue-500/10'>
                            <TrendingUp className='size-5 text-blue-400' />
                        </div>
                        <span className='text-sm text-base-content/60'>Active Subscribers</span>
                    </div>
                    <p className='text-2xl font-bold'>{subscribers.length}</p>
                </div>
                <div className='card bg-base-200 rounded-lg p-6 border border-base-100'>
                    <div className='flex items-center gap-3 mb-2'>
                        <div className='p-2 rounded-lg bg-purple-500/10'>
                            <Users className='size-5 text-purple-400' />
                        </div>
                        <span className='text-sm text-base-content/60'>Total Transactions</span>
                    </div>
                    <p className='text-2xl font-bold'>{payments.length}</p>
                </div>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <div className='card bg-base-200 rounded-lg border border-base-100 p-6'>
                    <h2 className='text-lg font-semibold mb-4'>Recent Transactions</h2>
                    <div className='space-y-3'>
                        {payments.slice(0, 10).map((p) => (
                            <div key={p._id} className='flex items-center justify-between py-2 border-b border-base-100 last:border-0'>
                                <div>
                                    <p className='text-sm font-medium'>{p.clerkId?.slice(0, 12) ?? "unknown"}...</p>
                                    <p className='text-xs text-base-content/40'>{p.plan} plan • {new Date(p.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-sm font-medium'>₹{p.amount}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.status]}`}>
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {payments.length === 0 && <p className='text-base-content/60 text-sm'>No transactions yet</p>}
                    </div>
                </div>

                <div className='card bg-base-200 rounded-lg border border-base-100 p-6'>
                    <h2 className='text-lg font-semibold mb-4'>Active Subscribers</h2>
                    <div className='space-y-3'>
                        {subscribers.filter(s => s.role !== "admin").map((s) => (
                            <div key={s._id} className='flex items-center justify-between py-2 border-b border-base-100 last:border-0'>
                                <div>
                                    <p className='text-sm font-medium'>{s.fullName}</p>
                                    <p className='text-xs text-base-content/40'>{s.subscriptionPlan} plan</p>
                                </div>
                                <div className='text-right'>
                                    <p className='text-xs text-base-content/60'>
                                        {s.subscriptionExpiry ? `Expires: ${new Date(s.subscriptionExpiry).toLocaleDateString()}` : "No expiry"}
                                    </p>
                                    <span className='text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400'>
                                        Active
                                    </span>
                                </div>
                            </div>
                        ))}
                        {subscribers.length === 0 && <p className='text-base-content/60 text-sm'>No active subscribers</p>}
                    </div>
                </div>
            </div>

            {pendingQrPayments.length > 0 && (
                <div className='mt-8 card bg-base-200 rounded-lg border border-base-100 p-6'>
                    <div className='flex items-center gap-2 mb-4'>
                        <QrCode className='size-5 text-purple-400' />
                        <h2 className='text-lg font-semibold'>Pending QR Payments</h2>
                        <span className='text-xs px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full'>
                            {pendingQrPayments.length} pending
                        </span>
                    </div>
                    <div className='space-y-3'>
                        {pendingQrPayments.map((p) => (
                            <div key={p._id} className='flex items-center justify-between py-3 border border-base-100 rounded-lg p-4 bg-base-100/50'>
                                <div>
                                    <p className='text-sm font-medium'>{p.userName || p.clerkId}</p>
                                    <p className='text-xs text-base-content/60'>{p.userEmail || "No email"}</p>
                                    <p className='text-xs text-base-content/40 mt-1'>
                                        {p.plan} plan • ₹{p.amount} • UTR: {p.paymentProof || "N/A"}
                                    </p>
                                    <p className='text-xs text-base-content/30'>
                                        {new Date(p.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                <div className='flex gap-2'>
                                    <button
                                        onClick={() => handleVerifyQrPayment(p._id, "approve")}
                                        disabled={loading}
                                        className='p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors'
                                    >
                                        {loading ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
                                    </button>
                                    <button
                                        onClick={() => handleVerifyQrPayment(p._id, "reject")}
                                        disabled={loading}
                                        className='p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors'
                                    >
                                        <X className='size-4' />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptions;