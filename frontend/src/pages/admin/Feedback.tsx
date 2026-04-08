import { useEffect, useState } from "react";
import { axiosInstance } from "../../lib/axios";
import { Star, Send, Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";

interface FeedbackItem {
    _id: string;
    userName: string;
    userEmail: string;
    rating: number;
    feedback: string;
    reply: string;
    replyAt: string | null;
    createdAt: string;
}

const AdminFeedback = () => {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
    const [replyingTo, setReplyingTo] = useState<string | null>(null);

    useEffect(() => {
        fetchFeedbacks() ;
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const res = await axiosInstance.get("/feedback/all");
            setFeedbacks(res.data);
        } catch (error) {
            console.error("Failed to fetch feedbacks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (feedbackId: string) => {
        if (!replyText[feedbackId]?.trim()) {
            toast.error("Please enter a reply");
            return;
        }
        setReplyingTo(feedbackId);
        try {
            await axiosInstance.post(`/feedback/${feedbackId}/reply`, { reply: replyText[feedbackId].trim() });
            toast.success("Reply sent!");
            fetchFeedbacks();
            setReplyText({ ...replyText, [feedbackId]: "" });
        } catch (error) {
            toast.error("Failed to send reply");
        } finally {
            setReplyingTo(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="size-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="size-6 text-amber-400" /> Feedbacks ({feedbacks.length})
            </h1>

            <div className="space-y-4">
                {feedbacks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No feedbacks yet</div>
                ) : (
                    feedbacks.map((fb) => (
                        <div key={fb._id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="font-medium text-white">{fb.userName}</p>
                                    <p className="text-sm text-gray-500">{fb.userEmail}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map((star) => (
                                        <Star key={star} className={`size-4 ${star <= fb.rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />
                                    ))}
                                </div>
                            </div>
                            
                            <p className="text-gray-300 mb-3">{fb.feedback}</p>
                            
                            <p className="text-xs text-gray-500 mb-3">
                                {new Date(fb.createdAt).toLocaleDateString("en-US", {
                                    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                                })}
                            </p>

                            {fb.reply ? (
                                <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <p className="text-xs text-emerald-400 font-medium mb-1">Admin Reply:</p>
                                    <p className="text-sm text-emerald-300">{fb.reply}</p>
                                    {fb.replyAt && (
                                        <p className="text-xs text-emerald-400/50 mt-1">
                                            {new Date(fb.replyAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText[fb._id] || ""}
                                        onChange={(e) => setReplyText({ ...replyText, [fb._id]: e.target.value })}
                                        placeholder="Write a reply..."
                                        className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/50"
                                    />
                                    <button
                                        onClick={() => handleReply(fb._id)}
                                        disabled={replyingTo === fb._id}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {replyingTo === fb._id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminFeedback;