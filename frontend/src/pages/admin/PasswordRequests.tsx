import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Key, Check, X, Clock, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

interface PasswordRequest {
    _id: string;
    userId: string;
    clerkId: string;
    userEmail: string;
    userName: string;
    newPassword: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
}

const AdminPasswordRequests = () =>  {
    const [requests, setRequests] = useState<PasswordRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
    const [confirmReject, setConfirmReject] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            const res = await axiosInstance.get("/admin/password-requests");
            setRequests(res.data);
        } catch (error) {
            console.error("Failed to fetch requests", error);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (requestId: string) => {
        setLoading(true);
        try {
            await axiosInstance.post(`/admin/password-requests/${requestId}/approve`);
            toast.success("Password change approved and applied!");
            setConfirmApprove(null);
            fetchRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to approve password change");
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (requestId: string) => {
        setLoading(true);
        try {
            await axiosInstance.post(`/admin/password-requests/${requestId}/reject`);
            toast.success("Password change request rejected");
            setConfirmReject(null);
            fetchRequests();
        } catch (error: any) {
            if (error.response?.status === 400) {
                await axiosInstance.post(`/admin/password-requests/${requestId}/force-reject`);
                toast.success("Corrupted request cleared");
                setConfirmReject(null);
                fetchRequests();
                return;
            }
            toast.error(error.response?.data?.message || "Failed to reject request");
        } finally {
            setLoading(false);
        }
    };

    const pendingRequests = requests.filter((r) => r.status === "pending");
    const processedRequests = requests.filter((r) => r.status !== "pending");

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Password Change Requests</h1>
            
            {pendingRequests.length === 0 && processedRequests.length === 0 ? (
                <div className="card bg-base-100 shadow-xl rounded-lg p-12 text-center">
                    <Key className="size-12 mx-auto text-base-content/30 mb-4" />
                    <p className="text-base-content/60">No password change requests</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {pendingRequests.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Clock className="size-5 text-yellow-400" /> Pending Requests ({pendingRequests.length})
                            </h2>
                            <div className="space-y-4">
                                {pendingRequests.map((request) => (
                                    <div key={request._id} className="card bg-base-100 shadow-xl rounded-lg p-6 border border-yellow-500/20">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg">{request.userName}</h3>
                                                <p className="text-sm text-base-content/60">{request.userEmail}</p>
                                                <p className="text-xs text-base-content/40 mt-1">Clerk ID: {request.clerkId}</p>
                                                <div className="mt-3 p-3 bg-base-200 rounded-lg">
                                                    <p className="text-xs text-base-content/60 mb-1">User:</p>
                                                    <p className="text-sm font-medium">{request.userName} ({request.userEmail})</p>
                                                </div>
                                                <p className="text-xs text-base-content/40 mt-2">
                                                    Requested: {new Date(request.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    onClick={() => setConfirmApprove(request._id)}
                                                    disabled={loading}
                                                    className="bg-emerald-500 hover:bg-emerald-400 text-white"
                                                >
                                                    <Check className="size-4 mr-1" /> Approve
                                                </Button>
                                                <Button
                                                    onClick={() => setConfirmReject(request._id)}
                                                    disabled={loading}
                                                    variant="outline"
                                                    className="text-red-400 border-red-400/20 hover:bg-red-500/10"
                                                >
                                                    <X className="size-4 mr-1" /> Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {processedRequests.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Processed Requests</h2>
                            <div className="space-y-3">
                                {processedRequests.map((request) => (
                                    <div key={request._id} className="card bg-base-100 shadow rounded-lg p-4 border border-base-200 opacity-70">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{request.userName}</p>
                                                <p className="text-sm text-base-content/60">{request.userEmail}</p>
                                            </div>
                                            <span className={`text-xs px-3 py-1 rounded-full ${
                                                request.status === "approved" 
                                                    ? "bg-emerald-500/10 text-emerald-400" 
                                                    : "bg-red-500/10 text-red-400"
                                            }`}>
                                                {request.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Approve Confirmation Modal */}
            {confirmApprove && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setConfirmApprove(null)}>
                    <div className="bg-base-100 rounded-2xl p-6 max-w-sm w-full border border-emerald-500/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                <Check className="size-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Approve Password Change?</h3>
                                <p className="text-sm text-base-content/60">This will update the user's password</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setConfirmApprove(null)} className="flex-1 py-2.5 bg-base-200 hover:bg-base-200/80 rounded-lg font-bold transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleApprove(confirmApprove)} disabled={loading} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-bold transition-colors disabled:opacity-50">
                                {loading ? "Approving..." : "Approve"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Confirmation Modal */}
            {confirmReject && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setConfirmReject(null)}>
                    <div className="bg-base-100 rounded-2xl p-6 max-w-sm w-full border border-red-500/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="size-10 bg-red-500/10 rounded-full flex items-center justify-center">
                                <AlertTriangle className="size-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Reject Password Change?</h3>
                                <p className="text-sm text-base-content/60">The user's password will remain unchanged</p>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setConfirmReject(null)} className="flex-1 py-2.5 bg-base-200 hover:bg-base-200/80 rounded-lg font-bold transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => handleReject(confirmReject)} disabled={loading} className="flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
                                {loading ? "Rejecting..." : "Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPasswordRequests;
