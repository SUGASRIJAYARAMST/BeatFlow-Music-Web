import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { CreditCard, TrendingUp, Users } from "lucide-react";

interface Payment {
    _id: string;
    clerkId: string;
    plan: string;
    amount: number;
    status: string;
    cashfreeOrderId: string;
    createdAt: string;
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
        </div>
    );
};

export default AdminSubscriptions;