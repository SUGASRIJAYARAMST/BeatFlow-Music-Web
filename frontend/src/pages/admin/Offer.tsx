import { useState, useEffect } from "react";
import { axiosInstance } from "../../lib/axios";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Zap, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";

const AdminOffer = () => {
    const [loading, setLoading] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [planId, setPlanId] = useState("yearly");
    const [active, setActive] = useState(false);

    useEffect(() => {
        fetchOffer();
    }, []);

    const fetchOffer = async () =>  {
        try {
            const res = await axiosInstance.get("/admin/offer");
            if (res.data) {
                setDiscount(res.data.discount || 0);
                setPlanId(res.data.planId || "yearly");
                setActive(res.data.active || false);
            }
        } catch (error) {
            console.error("Failed to fetch offer", error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await axiosInstance.post("/admin/offer", { discount, planId, active });
            toast.success("Offer saved successfully!");
        } catch (error) {
            toast.error("Failed to save offer");
        } finally {
            setLoading(false);
        }
    };

    const getPlanPrice = (pid: string) => {
        switch (pid) {
            case "daily": return 1;
            case "monthly": return 29;
            case "yearly": return 99;
            default: return 99;
        }
    };

    const getPlanName = (pid: string) => {
        switch (pid) {
            case "daily": return "Daily Plan";
            case "monthly": return "Monthly Plan";
            case "yearly": return "Yearly Plan";
            default: return "Yearly Plan";
        }
    };

    const originalPrice = getPlanPrice(planId);
    const discountedPrice = Math.round(originalPrice * (1 - discount / 100));

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Special Offer</h1>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="card bg-base-100 shadow-xl rounded-lg p-6 max-w-2xl space-y-6">
                <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-xl border border-white/5">
                    <div>
                        <p className="font-medium">Activate Offer</p>
                        <p className="text-sm text-base-content/60">Show offer on Pro page</p>
                    </div>
                    <Switch checked={active} onCheckedChange={setActive} />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70 mb-4.5 block">
                        Discount {discount > 0 ? `(${discount}%)` : "(%)"}
                    </label>
                    <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={discount}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        className="w-full bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12 px-4 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Apply to Plan</label>
                    <Select value={planId} onValueChange={setPlanId}>
                        <SelectTrigger className="bg-base-200 border border-white/10 focus:border-emerald-500 h-12">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="daily">Daily Plan (₹1)</SelectItem>
                            <SelectItem value="monthly">Monthly Plan (₹29)</SelectItem>
                            <SelectItem value="yearly">Yearly Plan (₹99)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {active && discount > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p className="text-sm text-amber-400 mb-2">Preview</p>
                        <p className="text-2xl font-bold">
                            <span className="line-through text-base-content/40 text-lg mr-2">₹{originalPrice}</span>
                            ₹{discountedPrice}
                            <span className="text-sm font-normal text-base-content/60 ml-2">/{planId === "daily" ? "day" : planId === "monthly" ? "month" : "year"}</span>
                        </p>
                        <p className="text-sm text-amber-400">{discount}% OFF - {getPlanName(planId)}</p>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12"
                >
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                    {loading ? "Saving..." : "Save Offer"}
                </Button>
            </form>
        </div>
    );
};

export default AdminOffer;
