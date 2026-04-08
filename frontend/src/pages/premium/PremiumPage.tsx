import { useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import { useLanguageStore } from "../../stores/useLanguageStore";
import { useWalletStore } from "../../stores/useWalletStore";
import { axiosInstance } from "../../lib/axios";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Check, Zap, Loader2, CreditCard, X, ShieldCheck, Lock, KeyRound, Wallet as WalletIcon, Tag, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

type PaymentStep = "details" | "pin" | "processing" | "success" | "failed";

const ProPage = () => {
    const { user } = useUser();
    const clerk = useClerk();
    const navigate = useNavigate();
    const createOrder = useSubscriptionStore((state) => state.createOrder);
    const verifyPayment = useSubscriptionStore((state) => state.verifyPayment);
    const isLoading = useSubscriptionStore((state) => state.isLoading);
    const isPremium = useSubscriptionStore((state) => state.isPremium);
    const checkSubscription = useSubscriptionStore((state) => state.checkSubscription);
    const { t } = useLanguageStore();
    const { balance: walletBalance, fetchWallet, payFromWallet, fetchPinStatus, verifyPin, hasPin } = useWalletStore();
    const [selectedPlan, setSelectedPlan] = useState("monthly");
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [testOrderId, setTestOrderId] = useState("");
    const [paymentStep, setPaymentStep] = useState<PaymentStep>("details");
    const [processingMessage, setProcessingMessage] = useState("");
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinAttempts, setPinAttempts] = useState(0);
    const [showPin, setShowPin] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"card" | "wallet">("card");
    const [offer, setOffer] = useState<{ discount: number; planId: string; active: boolean } | null>(null);

    useEffect(() => { checkSubscription(); }, [checkSubscription]);
    useEffect(() => { fetchWallet(); fetchPinStatus(); }, [fetchWallet, fetchPinStatus]);
    const fetchOffer = async () => {
        try {
            const res = await axiosInstance.get("/admin/offer");
            setOffer(res.data);
        } catch {}
    };
    useEffect(() => { fetchOffer(); }, []);

    const plans = [
        { id: "daily", name: t("daily_plan"), price: offer?.active && offer?.planId === "daily" ? Math.round(1 * (1 - offer.discount / 100)) : 1, originalPrice: 1, period: t("per_day"), features: [t("ad_free"), t("basic_support")] },
        { id: "monthly", name: t("monthly_plan"), price: offer?.active && offer?.planId === "monthly" ? Math.round(29 * (1 - offer.discount / 100)) : 29, originalPrice: 29, period: t("per_month"), features: [t("all_daily"), t("high_quality"), t("priority_support"), t("play_any_order"), t("no_ads")], popular: true },
        { id: "yearly", name: t("yearly_plan"), price: offer?.active && offer?.planId === "yearly" ? Math.round(99 * (1 - offer.discount / 100)) : 99, originalPrice: 99, period: t("per_year"), features: [t("all_monthly"), t("download_songs_feature"), t("exclusive_badges"), t("early_access"), t("best_value_desc")], bestValue: true },
    ];

    const selectedPlanData = plans.find(p => p.id === selectedPlan) ?? plans[1];
    const hasEnoughBalance = walletBalance >= selectedPlanData?.price;
    
    const getRequiredAmount = () => {
        const plan = plans.find(p => p.id === selectedPlan);
        return plan?.price || 0;
    };

    const handlePay = () => {
        setPaymentStep("pin");
    };

    const handlePayment = async () => {
        if (!user) return toast.error("Please login to subscribe");
        
        if (paymentMethod === "wallet") {
            if (!hasEnoughBalance) {
                toast.error("Insufficient wallet balance. Please add money first.");
                navigate("/wallet");
                return;
            }
            setTestOrderId(`wallet_${Date.now()}`);
            setPaymentStep("pin");
            setShowPaymentModal(true);
            return;
        }

        const result = await createOrder(selectedPlan as any);
        if (!result) return;
        
        if (result.testMode) {
            setTestOrderId(result.orderId);
            setPaymentStep("details");
            setShowPaymentModal(true);
        } else {
            const Cashfree = (window as any).Cashfree;
            if (!Cashfree) {
                toast.error("Payment SDK not loaded. Please refresh.");
                return;
            }
            try { 
                const c = new Cashfree(); 
                c.checkout({ paymentSessionId: result.paymentSessionId, redirectTarget: "_modal" }); 
            } catch { 
                toast.error("Payment failed. Please try again."); 
            }
        }
    };

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setPinError("Please enter 4-digit PIN");
            toast.error("Please enter 4-digit PIN");
            return;
        }
        
        setPinError("");
        setPaymentStep("processing");
        setProcessingMessage("Verifying PIN...");
        
        const result = await verifyPin(pin);
        
        if (result.needsSetup) {
            setPinError("Please set up your PIN first");
            toast.error("Please set up your PIN first");
            setPaymentStep("pin");
            setPin("");
            setShowPaymentModal(false);
            navigate("/wallet");
            return;
        }
        
        if (!result.verified) {
            const newAttempts = pinAttempts + 1;
            setPinAttempts(newAttempts);
            setPinError("Incorrect PIN. Please try again.");
            toast.error("Incorrect PIN");
            setPaymentStep("pin");
            setPin("");
            
            if (newAttempts >= 3) {
                toast.error("Too many failed attempts. Logging out for security.");
                await clerk.signOut();
                window.location.href = "/";
                return;
            }
            return;
        }

        setPinAttempts(0);
        setProcessingMessage("Processing payment...");
        
        if (paymentMethod === "wallet") {
            const success = await payFromWallet(selectedPlan);
            if (success) {
                setPaymentStep("success");
            } else {
                setPinError("Insufficient balance. Please add money to wallet.");
                toast.error("Insufficient balance. Please add money to wallet.");
                setPaymentStep("pin");
                setPin("");
            }
        } else {
            const success = await verifyPayment(testOrderId);
            if (success) {
                setPaymentStep("success");
            } else {
                setPinError("Payment verification failed. Please try again.");
                toast.error("Payment verification failed. Please try again.");
                setPaymentStep("pin");
                setPin("");
            }
        }
    };

    const handleWalletPay = async () => {
        if (pin.length !== 4) {
            setPinError("Please enter 4-digit PIN");
            return;
        }
        
        setPinError("");
        setIsVerifying(true);
        setPaymentStep("processing");
        setProcessingMessage("Verifying PIN...");
        
        const result = await verifyPin(pin);
        
        if (result.needsSetup) {
            setPinError("Please set up your PIN in wallet first");
            setIsVerifying(false);
            setPaymentStep("pin");
            setPin("");
            setShowPaymentModal(false);
            navigate("/wallet");
            return;
        }
        
        if (!result.verified) {
            const newAttempts = pinAttempts + 1;
            setPinAttempts(newAttempts);
            setPinError("Incorrect PIN. Please try again.");
            setIsVerifying(false);
            setPaymentStep("pin");
            setPin("");
            
            if (newAttempts >= 3) {
                toast.error("Too many failed attempts. Logging out for security.");
                await clerk.signOut();
                window.location.href = "/";
                return;
            }
            return;
        }

        setPinAttempts(0);
        setProcessingMessage("Processing payment from wallet...");
        const success = await payFromWallet(selectedPlan);
        setIsVerifying(false);
        if (success) {
            setPaymentStep("success");
        } else {
            setPinError("Insufficient balance. Please add money to wallet.");
            setPaymentStep("pin");
            setPin("");
        }
    };

    const closeModal = () => {
        if (paymentStep === "success") {
            window.location.reload();
        }
        setShowPaymentModal(false);
        setPaymentStep("details");
    };

    const resetPin = () => setPin("");

    if (isPremium) return (<div className='h-full bg-main-gradient'><Topbar /><div className='flex items-center justify-center h-[calc(100vh-180px)]'><div className='text-center space-y-4'><div className='inline-flex items-center justify-center size-16 rounded-full bg-emerald-500/10'><Check className='size-8 text-emerald-500' /></div><h1 className='text-3xl font-bold text-white'>You're Pro!</h1><p className='text-gray-400'>Enjoy all Pro features</p></div></div></div>);

    return (
        <div className='h-full bg-[#121212]'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]'>
                <div className='p-4 md:p-6 max-w-5xl mx-auto'>
                    <div className='text-center mb-10'>
                        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 mb-4'>
                            <Zap className='size-4' /> BeatFlow Pro
                        </div>
                        <h1 className='text-4xl font-bold text-white mb-2'>{t("upgrade_title")}</h1>
                        <p className='text-gray-400'>{t("upgrade_subtitle")}</p>
                    </div>

                    <div className='grid md:grid-cols-3 gap-6'>
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                                    selectedPlan === plan.id
                                        ? "border-emerald-500 bg-emerald-500/5"
                                        : "border-white/10 bg-[#181818] hover:border-white/20"
                                }`}
                            >
                                {plan.popular && (
                                    <div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-3 py-1 rounded-full'>
                                        {t("popular")}
                                    </div>
                                )}
                                {plan.bestValue && (
                                    <div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full'>
                                        {t("best_value")}
                                    </div>
                                )}
                                {offer?.active && offer?.planId === plan.id && (
                                    <div className='absolute -top-3 right-2 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1'>
                                        <Tag className='size-3' /> {offer.discount}% OFF
                                    </div>
                                )}
                                <h3 className='text-lg font-bold text-white'>{plan.name}</h3>
                                <div className='flex items-baseline gap-1 my-3'>
                                    <span className='text-3xl font-bold text-white'>₹{plan.price}</span>
                                    {plan.price < plan.originalPrice && (
                                        <span className='text-sm text-gray-500 line-through'>₹{plan.originalPrice}</span>
                                    )}
                                    <span className='text-gray-400 text-sm'>{plan.period}</span>
                                </div>
                                <ul className='space-y-2'>
                                    {plan.features.map((f) => (
                                        <li key={f} className='flex items-center gap-2 text-sm text-gray-300'>
                                            <Check className='size-3 text-emerald-400 shrink-0' />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className='flex justify-center mt-8'>
                        <div className='w-full max-w-md space-y-3'>
                            <div className='flex gap-3'>
                                <button
                                    onClick={() => setPaymentMethod("wallet")}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                        paymentMethod === "wallet"
                                            ? "border-emerald-500 bg-emerald-500/10"
                                            : "border-white/10 bg-white/5 hover:border-white/20"
                                    }`}
                                >
                                    <div className='flex items-center gap-3'>
                                        <WalletIcon className={`size-6 ${paymentMethod === "wallet" ? "text-emerald-400" : "text-gray-400"}`} />
                                        <div className='text-left'>
                                            <p className={`font-bold ${paymentMethod === "wallet" ? "text-emerald-400" : "text-white"}`}>Wallet</p>
                                            <p className='text-xs text-gray-400'>Balance: ₹{(walletBalance ?? 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setPaymentMethod("card")}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                        paymentMethod === "card"
                                            ? "border-emerald-500 bg-emerald-500/10"
                                            : "border-white/10 bg-white/5 hover:border-white/20"
                                    }`}
                                >
                                    <div className='flex items-center gap-3'>
                                        <CreditCard className={`size-6 ${paymentMethod === "card" ? "text-emerald-400" : "text-gray-400"}`} />
                                        <div className='text-left'>
                                            <p className={`font-bold ${paymentMethod === "card" ? "text-emerald-400" : "text-white"}`}>Card</p>
                                            <p className='text-xs text-gray-400'>Test Mode</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                            
                            {paymentMethod === "wallet" && !hasEnoughBalance && (
                                <p className='text-sm text-red-400 text-center'>
                                    Insufficient balance. <button onClick={() => navigate("/wallet")} className='underline'>Add money</button>
                                </p>
                            )}

                            <Button
                                size='lg'
                                className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-full text-lg'
                                onClick={handlePayment}
                                disabled={isLoading || (paymentMethod === "wallet" && !hasEnoughBalance)}
                            >
                                {isLoading ? <Loader2 className='size-5 animate-spin' /> : (
                                    paymentMethod === "wallet" ? `Pay ₹${selectedPlanData?.price} from Wallet` : `Pay ₹${selectedPlanData?.price}`
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            {showPaymentModal && (
                <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50'>
                    <div className='bg-[#1a1a1a] rounded-2xl max-w-md w-full mx-4 border border-white/10 shadow-2xl overflow-hidden'>
                        {paymentStep === "details" && (
                            <>
                                <div className='p-6 border-b border-white/10'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className='size-10 bg-emerald-500/20 rounded-full flex items-center justify-center'>
                                                <ShieldCheck className='size-5 text-emerald-400' />
                                            </div>
                                            <div>
                                                <h2 className='text-lg font-bold text-white'>Secure Payment</h2>
                                                <p className='text-xs text-gray-400'>Encrypted & Secure</p>
                                            </div>
                                        </div>
                                        <button onClick={closeModal} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                            <X className='size-5 text-gray-400' />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className='p-6'>
                                    <div className='flex items-center gap-4 p-4 bg-[#252525] rounded-xl mb-4'>
                                        <div className='size-12 bg-emerald-500/20 rounded-lg flex items-center justify-center'>
                                            <Zap className='size-6 text-emerald-400' />
                                        </div>
                                        <div className='flex-1'>
                                            <p className='font-bold text-white'>{selectedPlanData?.name}</p>
                                            <p className='text-sm text-gray-400'>BeatFlow Pro</p>
                                        </div>
                                        <div className='text-right'>
                                            <p className='text-xl font-bold text-white'>₹{selectedPlanData?.price}</p>
                                            <p className='text-xs text-gray-400'>{selectedPlanData?.period}</p>
                                        </div>
                                    </div>

                                    <div className='space-y-4'>
                                        <div className='p-4 bg-[#252525] rounded-xl flex items-center gap-3'>
                                            <CreditCard className='size-5 text-gray-400' />
                                            <div className='flex-1'>
                                                <p className='text-sm font-medium text-white'>Test Card</p>
                                                <p className='text-xs text-gray-400'>•••• •••• •••• 4242</p>
                                            </div>
                                            <span className='text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded'>TEST</span>
                                        </div>

                                        <div className='flex items-center gap-2 text-xs text-gray-400'>
                                            <Lock className='size-3' />
                                            <span>Your payment is secured with 256-bit encryption</span>
                                        </div>
                                    </div>
                                </div>

                                <div className='p-6 pt-0 space-y-3'>
                                    <Button
                                        onClick={handlePay}
                                        className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl'
                                    >
                                        <ShieldCheck className='size-5 mr-2' /> Pay ₹{selectedPlanData?.price}
                                    </Button>
                                    <Button
                                        onClick={closeModal}
                                        variant="ghost"
                                        className='w-full text-gray-400 hover:text-white h-10'
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </>
                        )}

                        {paymentStep === "pin" && (
                            <>
                                <div className='p-6 border-b border-white/10'>
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-3'>
                                            <div className={`size-10 rounded-full flex items-center justify-center ${
                                                paymentMethod === "wallet" ? "bg-amber-500/20" : "bg-amber-500/20"
                                            }`}>
                                                <KeyRound className={`size-5 ${
                                                    paymentMethod === "wallet" ? "text-amber-400" : "text-amber-400"
                                                }`} />
                                            </div>
                                            <div>
                                                <h2 className='text-lg font-bold text-white'>
                                                    {paymentMethod === "wallet" ? "Enter Password" : "Enter PIN"}
                                                </h2>
                                                <p className='text-xs text-gray-400'>Verify your payment</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setPaymentStep("details")} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                            <X className='size-5 text-gray-400' />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className='p-6'>
                                    <div className='flex items-center gap-4 p-4 bg-[#252525] rounded-xl mb-4'>
                                        <div className='size-12 bg-emerald-500/20 rounded-lg flex items-center justify-center'>
                                            {paymentMethod === "wallet" ? (
                                                <WalletIcon className='size-6 text-emerald-400' />
                                            ) : (
                                                <Zap className='size-6 text-emerald-400' />
                                            )}
                                        </div>
                                        <div className='flex-1'>
                                            <p className='font-bold text-white'>{selectedPlanData?.name}</p>
                                            <p className='text-sm text-gray-400'>BeatFlow Pro</p>
                                        </div>
                                        <div className='text-right'>
                                            <p className='text-xl font-bold text-white'>₹{selectedPlanData?.price}</p>
                                            <p className='text-xs text-gray-400'>{selectedPlanData?.period}</p>
                                        </div>
                                    </div>

                                    {paymentMethod === "wallet" ? (
                                        <div className='space-y-4'>
                                            <div className='text-center mb-6'>
                                                <p className='text-sm text-gray-400 mb-4'>Enter your 4-digit PIN</p>
                                                <div className='flex justify-center gap-3'>
                                                    {[0, 1, 2, 3].map((i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => document.getElementById('premium-wallet-pin-input')?.focus()}
                                                            className={`pin-box w-12 h-12 bg-[#252525] border rounded-lg flex items-center justify-center text-xl font-bold text-white transition-colors cursor-pointer ${
                                                                pinError ? "border-red-500" : "border-white/20"
                                                            }`}
                                                        >
                                                            {pin[i] ? (showPin ? pin[i] : "•") : ""}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-center items-center gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPin(!showPin)}
                                                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                                                    >
                                                        {showPin ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                                        {showPin ? "Hide" : "Show"}
                                                    </button>
                                                </div>
                                                <input
                                                    id="premium-wallet-pin-input"
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    className="absolute opacity-0 pointer-events-none"
                                                    value={pin}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                        setPin(val);
                                                        setPinError("");
                                                    }}
                                                    autoFocus
                                                />
                                                {pinError && (
                                                    <p className='text-red-400 text-sm mt-3'>{pinError}</p>
                                                )}
                                                {pinAttempts > 0 && (
                                                    <p className='text-amber-400 text-sm mt-2'>{3 - pinAttempts} attempt(s) remaining</p>
                                                )}
                                            </div>

                                            <div className='grid grid-cols-3 gap-3 mb-6'>
                                                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            if (key === "del") {
                                                                setPin(pin.slice(0, -1));
                                                            } else if (key && pin.length < 4) {
                                                                setPin(pin + key);
                                                            }
                                                        }}
                                                        disabled={key === ""}
                                                        className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                                                            key === "del"
                                                                ? "bg-transparent text-gray-400 hover:text-white"
                                                                : key === ""
                                                                ? "bg-transparent"
                                                                : "bg-[#252525] text-white hover:bg-[#333]"
                                                        }`}
                                                    >
                                                        {key === "del" ? "⌫" : key}
                                                    </button>
                                                ))}
                                            </div>

                                            <Button
                                                onClick={handleWalletPay}
                                                disabled={pin.length !== 4 || isVerifying}
                                                className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                            >
                                                {isVerifying ? <Loader2 className='size-5 animate-spin' /> : `Pay ₹${selectedPlanData?.price} from Wallet`}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className='space-y-4'>
                                            <div className='text-center mb-6'>
                                                <p className='text-sm text-gray-400 mb-4'>Enter your 4-digit test PIN</p>
                                                <div className='flex justify-center gap-3'>
                                                    {[0, 1, 2, 3].map((i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => document.getElementById('premium-test-pin-input')?.focus()}
                                                            className={`pin-box w-12 h-12 bg-[#252525] border rounded-lg flex items-center justify-center text-xl font-bold text-white transition-colors cursor-pointer ${
                                                                pinError ? "border-red-500" : "border-white/20"
                                                            }`}
                                                        >
                                                            {pin[i] ? (showPin ? pin[i] : "•") : ""}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-center items-center gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPin(!showPin)}
                                                        className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                                                    >
                                                        {showPin ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                                        {showPin ? "Hide" : "Show"}
                                                    </button>
                                                </div>
                                                <input
                                                    id="premium-test-pin-input"
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    className="absolute opacity-0 pointer-events-none"
                                                    value={pin}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                        setPin(val);
                                                        setPinError("");
                                                    }}
                                                    autoFocus
                                                />
                                                {pinError && (
                                                    <p className='text-red-400 text-sm mt-3'>{pinError}</p>
                                                )}
                                                {pinAttempts > 0 && (
                                                    <p className='text-amber-400 text-sm mt-2'>{3 - pinAttempts} attempt(s) remaining</p>
                                                )}
                                            </div>

                                            <div className='grid grid-cols-3 gap-3 mb-6'>
                                                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => (
                                                    <button
                                                        key={key}
                                                        onClick={() => {
                                                            if (key === "del") {
                                                                setPin(pin.slice(0, -1));
                                                            } else if (key && pin.length < 4) {
                                                                setPin(pin + key);
                                                            }
                                                        }}
                                                        disabled={key === ""}
                                                        className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                                                            key === "del"
                                                                ? "bg-transparent text-gray-400 hover:text-white"
                                                                : key === ""
                                                                ? "bg-transparent"
                                                                : "bg-[#252525] text-white hover:bg-[#333]"
                                                        }`}
                                                    >
                                                        {key === "del" ? "⌫" : key}
                                                    </button>
                                                ))}
                                            </div>

                                            <Button
                                                onClick={handlePinSubmit}
                                                disabled={pin.length !== 4}
                                                className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                            >
                                                Confirm Payment
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {paymentStep === "processing" && (
                            <div className='p-12 text-center'>
                                <div className='size-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center'>
                                    <Loader2 className='size-8 text-emerald-400 animate-spin' />
                                </div>
                                <h2 className='text-xl font-bold text-white mb-2'>Processing Payment</h2>
                                <p className='text-gray-400'>{processingMessage}</p>
                            </div>
                        )}

                        {paymentStep === "success" && (
                            <div className='p-12 text-center'>
                                <div className='size-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center'>
                                    <Check className='size-8 text-emerald-400' />
                                </div>
                                <h2 className='text-xl font-bold text-white mb-2'>Payment Successful!</h2>
                                <p className='text-gray-400 mb-6'>Your subscription has been activated</p>
                                <Button
                                    onClick={closeModal}
                                    className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl'
                                >
                                    Continue to BeatFlow
                                </Button>
                            </div>
                        )}

                        {paymentStep === "failed" && (
                            <div className='p-12 text-center'>
                                <div className='size-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center'>
                                    <X className='size-8 text-red-400' />
                                </div>
                                <h2 className='text-xl font-bold text-white mb-2'>Payment Failed</h2>
                                <p className='text-gray-400 mb-6'>Something went wrong. Please try again.</p>
                                <Button
                                    onClick={() => { setPin(""); setPinError(""); setPaymentStep("pin"); }}
                                    className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl'
                                >
                                    Try Again
                                </Button>
                            </div>
                        ) }
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProPage;
