import { useEffect, useState } from "react";
import { useWalletStore } from "../../stores/useWalletStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useLanguageStore } from "../../stores/useLanguageStore";
import { axiosInstance } from "../../lib/axios";
import { useClerk } from "@clerk/react";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, Loader2, History, X, KeyRound, ShieldCheck, Trash2, Crown, AlertCircle, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

type AddStep = "setup" | "amount" | "pin" | "processing" | "success";
type ModalType = "addMoney" | "clearConfirm" | null;

const WalletPage = () => {
    const { balance, transactions, isLoading, fetchWallet, fetchPinStatus, setPin, verifyPin, addMoney, clearTransactions, syncPastPayments } = useWalletStore();
    const { t } = useLanguageStore();
    const authUser = useAuthStore((state) => state.user);
    const isAdmin = authUser?.role === "admin";
    const [showAddMoney, setShowAddMoney] = useState(false);
    const [amount, setAmount] = useState("");
    const [pin, setPinState] = useState("");
    const [pinError, setPinError] = useState("");
    const [addStep, setAddStep] = useState<AddStep>("setup");
    const [hasPin, setHasPin] = useState<boolean | null>(null);
    const [modalType, setModalType] = useState<ModalType>(null);
    const [showForgotPin, setShowForgotPin] = useState(false);
    const [forgotPinStep, setForgotPinStep] = useState<"pin" | "verify">("pin");
    const [forgotPinNewPin, setForgotPinNewPin] = useState("");
    const [forgotPinPass, setForgotPinPass] = useState("");
    const [forgotPinAttempts, setForgotPinAttempts] = useState(() => {
        const saved = localStorage.getItem("forgotPinAttempts");
        return saved ? parseInt(saved) : 0;
    });
    const [pinAttempts, setPinAttempts] = useState(0);
    const [showForgotPass, setShowForgotPass] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [showForgotPinDigits, setShowForgotPinDigits] = useState(false);
    const [submittingRequest, setSubmittingRequest] = useState(false);
    const [lockedTimeRemaining, setLockedTimeRemaining] = useState<string | null>(null);
    const clerk = useClerk();

    useEffect(() => {
        fetchWallet();
        if (!isAdmin) {
            checkPinStatus();
        } else {
            syncPastPayments();
        }
    }, [fetchWallet]);

    useEffect(() => {
        const checkAndStartTimer = () => {
            let lockedAt = localStorage.getItem("forgotPinLockedAt");
            const attempts = parseInt(localStorage.getItem("forgotPinAttempts") || "0");
            console.log("Wallet timer - attempts:", attempts, "lockedAt:", lockedAt);
            
            if (attempts >= 3 && !lockedAt) {
                localStorage.setItem("forgotPinLockedAt", Date.now().toString());
                lockedAt = localStorage.getItem("forgotPinLockedAt");
            }
            
            if (attempts < 3 || !lockedAt) {
                console.log("No timer needed - attempts:", attempts);
                return;
            }
            
            const updateTimer = () => {
                const lockedTime = parseInt(lockedAt);
                const now = Date.now();
                const lockDuration = 60 * 60 *2 * 1000; // 2 hr
                const remaining = lockDuration - (now - lockedTime);
                
                console.log("Wallet remaining:", remaining);
                
                if (remaining <= 0) {
                    localStorage.setItem("forgotPinAttempts", "0");
                    localStorage.removeItem("forgotPinLockedAt");
                    setForgotPinAttempts(0);
                    setLockedTimeRemaining(null);
                    return false;
                }
                
                const secs = Math.floor(remaining / 1000);
                const mins = Math.floor(secs / 60);
                const hours = Math.floor(mins / 60);
                let timeStr;
                if (hours > 0) {
                    timeStr = `${hours}h ${mins % 60}m`;
                } else if (mins > 0) {
                    timeStr = `${mins}m ${secs % 60}s`;
                } else {
                    timeStr = `${secs}s`;
                }
                console.log("Setting lockedTimeRemaining to:", timeStr);
                setLockedTimeRemaining(timeStr);
                return true;
            };
            
            updateTimer();
            const interval = setInterval(() => {
                if (!updateTimer()) clearInterval(interval);
            }, 1000);
            
            return () => clearInterval(interval);
        };
        
        checkAndStartTimer();
    }, []);

    const checkPinStatus = async () => {
        const status = await fetchPinStatus();
        setHasPin(status);
        if (!status) {
            setShowAddMoney(true);
        }
        setAddStep(status ? "amount" : "setup");
    };

    const handleSetupPin = async () => {
        if (pin.length !== 4) {
            toast.error("PIN must be 4 digits");
            return;
        }
        const success = await setPin(pin);
        if (success) {
            setHasPin(true);
            setAddStep("amount");
        }
    };

    const handleAddMoney = async () => {
        const amountNum = parseFloat(amount);
        if (!amountNum || amountNum <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }
        setAddStep("pin");
    };

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setPinError("Please enter 4-digit PIN");
            toast.error("Please enter 4-digit PIN");
            return;
        }
        
        setPinError("");
        const result = await verifyPin(pin);
        if (result.needsSetup) {
            setPinError("Please set up your PIN first");
            toast.error("Please set up your PIN first");
            setAddStep("setup");
            setPinState("");
            return;
        }
        if (!result.verified) {
            const newAttempts = pinAttempts + 1;
            setPinAttempts(newAttempts);
            setPinError("Incorrect PIN");
            toast.error("Incorrect PIN");
            setPinState("");
            
            if (newAttempts >= 3) {
                toast.error("Too many failed attempts. Logging out for security.");
                await clerk.signOut();
                window.location.href = "/";
                return;
            }
            return;
        }

        setPinAttempts(0);
        setAddStep("processing");
        const success = await addMoney(parseFloat(amount));
        if (success) {
            setAddStep("success");
            fetchWallet();
        } else {
            setAddStep("amount");
        }
    };

    const handleForgotPinSubmit = async () => {
        if (forgotPinNewPin.length !== 4) {
            toast.error("PIN must be 4 digits");
            return;
        }
        setForgotPinStep("verify");
    };

    const handleForgotPinVerify = async () => {
        if (!forgotPinPass) {
            toast.error("Please enter your password");
            return;
        }
        try {
            setSubmittingRequest(true);
            
            await axiosInstance.post("/users/verify-password", { password: forgotPinPass });
            
            await axiosInstance.post("/pin-reset", { newPin: forgotPinNewPin });
            toast.success("PIN reset request sent to admin!");
            setForgotPinAttempts(0);
            localStorage.setItem("forgotPinAttempts", "0");
        } catch (error: any) {
            const newAttempts = forgotPinAttempts + 1;
            setForgotPinAttempts(newAttempts);
            localStorage.setItem("forgotPinAttempts", newAttempts.toString());
            setForgotPinPass("");
            if (error.response?.data?.message?.includes("pending")) {
                toast.error("You already have a pending PIN reset request");
                setShowForgotPin(false);
                setForgotPinStep("pin");
                setForgotPinNewPin("");
                setForgotPinPass("");
                return;
            }
            if (newAttempts >= 3) {
                toast.error("Too many failed attempts. You cannot submit more PIN reset requests.");
                localStorage.setItem("forgotPinLockedAt", Date.now().toString());
                setShowForgotPin(false);
                setForgotPinStep("pin");
                setForgotPinNewPin("");
                setForgotPinPass("");
                return;
            }
            if (error.response?.data?.message?.includes("social") || error.response?.data?.message?.includes("password")) {
                toast.error(`${error.response.data.message}. ${3 - newAttempts} attempt(s) remaining.`);
            } else {
                toast.error(error.response?.data?.message || "Verification failed");
            }
        } finally { setSubmittingRequest(false); }
    };

    const handleRequestPinReset = async () => {
        try {
            setSubmittingRequest(true);
            await axiosInstance.post("/pin-reset");
            toast.success("PIN reset request sent to admin!");
            setShowForgotPin(false);
            setForgotPinStep("pin");
            setForgotPinNewPin("");
            setForgotPinPass("");
            setForgotPinAttempts(0);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to send PIN reset request");
        } finally { setSubmittingRequest(false); }
    };

    const closeModal = () => {
        setShowAddMoney(false);
        setAmount("");
        setPinState("");
        setPinError("");
        setAddStep(hasPin ? "amount" : "setup");
    };

    const handleClearTransactions = async () => {
        setModalType("clearConfirm");
    };

    const confirmClearTransactions = async () => {
        setModalType(null);
        await clearTransactions();
    };

    const MAX_WALLET_BALANCE = 200;
    const quickAmounts = [100, 200];

    const isLocked = forgotPinAttempts >= 3 || parseInt(localStorage.getItem("forgotPinAttempts") || "0") >= 3;
    const displayText = lockedTimeRemaining ? `Locked (${lockedTimeRemaining})` : isLocked ? "Locked" : "Forgot PIN?";

    if (hasPin === null && !isAdmin) {
        return (
            <div className='h-full bg-[#121212]'>
                <Topbar />
                <div className='flex items-center justify-center h-[calc(100vh-180px)]'>
                    <Loader2 className='size-8 text-emerald-400 animate-spin' />
                </div>
            </div>
        );
    }

    return (
        <div className='h-full bg-[#121212]'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-180px)]'>
                <div className='p-6 max-w-2xl mx-auto'>
                    <div className='text-center mb-8'>
                        <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-sm font-medium border border-emerald-500/20 mb-4'>
                            {isAdmin ? <Crown className='size-4' /> : <WalletIcon className='size-4' />} {isAdmin ? t("admin_dashboard") : t("wallet_title")}
                        </div>
                        <h1 className='text-3xl font-bold text-white mb-2'>{t("wallet_title")}</h1>
                        {isAdmin && <p className='text-emerald-400/60 text-sm'>{t("transaction_history")}</p>}
                    </div>

                    <div className='bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-6 border border-emerald-500/20 mb-6'>
                        <div className='flex justify-between items-start mb-1'>
                            <p className='text-emerald-400/60 text-sm'>{t("available_balance")}</p>
                            {!isAdmin && <p className='text-emerald-400/60 text-xs'>{t("amount")}: ₹{MAX_WALLET_BALANCE}</p>}
                            {isAdmin && <p className='text-emerald-400/60 text-xs flex items-center gap-1'><Crown className='size-3' /> {t("no_ads")}</p>}
                        </div>
                        <div className='flex items-baseline gap-2'>
                            <span className='text-4xl font-bold text-white'>₹</span>
                            <span className='text-5xl font-bold text-white'>{(balance ?? 0).toFixed(2)}</span>
                        </div>
                        {!isAdmin && balance >= MAX_WALLET_BALANCE && (
                            <p className='text-amber-400 text-sm mt-2'>{t("max_balance")}</p>
                        )}
                        {isAdmin && (
                            <p className='text-emerald-400 text-sm mt-2'>{t("admin_wallet_info")}</p>
                        )}
                    </div>

                    {!isAdmin && (
                        <div className='flex gap-3 mb-6'>
                            <Button
                                onClick={() => {
                                    if (balance >= MAX_WALLET_BALANCE) {
                                        toast.error(t("max_wallet_reached"));
                                        return;
                                    }
                                    setShowAddMoney(true);
                                    setAddStep(hasPin ? "amount" : "setup");
                                }}
                                className={`flex-1 font-bold h-12 rounded-xl ${balance >= MAX_WALLET_BALANCE ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : hasPin ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'}`}
                                disabled={balance >= MAX_WALLET_BALANCE && !!hasPin}
                            >
                                {hasPin ? (
                                    <><Plus className='size-5 mr-2' /> {t("add_money")}</>
                                ) : (
                                    <><KeyRound className='size-5 mr-2' /> {t("set_pin")}</>
                                )}
                            </Button>
                        </div>
                    )}

                    <div className='bg-[#181818] rounded-2xl p-6 border border-white/10'>
                        <div className='flex items-center justify-between mb-4'>
                            <div className='flex items-center gap-2'>
                                <History className='size-5 text-emerald-400' />
                                <h2 className='text-lg font-bold text-white'>{t("transaction_history")}</h2>
                            </div>
                            {transactions.length > 0 && (
                                <button
                                    onClick={handleClearTransactions}
                                    className='p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-red-400'
                                    title={t("clear_transactions_title")}
                                >
                                    <Trash2 className='size-4' />
                                </button>
                            )}
                        </div>

                        {transactions.length === 0 ? (
                            <div className='text-center py-8'>
                                <WalletIcon className='size-12 mx-auto text-gray-500 mb-3' />
                                <p className='text-gray-400'>{t("no_transactions")}</p>
                            </div>
                        ) : (
                            <div className='space-y-3'>
                                {transactions.map((tx: any, index: number) => (
                                    <div key={index} className='flex items-center justify-between p-3 bg-white/5 rounded-xl'>
                                        <div className='flex items-center gap-3'>
                                            <div className={`size-10 rounded-full flex items-center justify-center ${
                                                tx.type === "credit" ? "bg-emerald-500/20" : "bg-red-500/20"
                                            }`}>
                                                {tx.type === "credit" ? (
                                                    <ArrowDownLeft className='size-5 text-emerald-400' />
                                                ) : (
                                                    <ArrowUpRight className='size-5 text-red-400' />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                {isAdmin && tx.description.includes(" - ") ? (
                                                    <>
                                                        <p className='text-sm font-medium text-white truncate'>{tx.description.split(" - ")[0]}</p>
                                                        <p className='text-xs text-emerald-400'>{tx.description.split(" - ")[1]}</p>
                                                    </>
                                                ) : (
                                                    <p className='text-sm font-medium text-white'>{tx.description}</p>
                                                )}
                                                <p className='text-xs text-gray-400'>
                                                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                                                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-bold ${tx.type === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                                            {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {showAddMoney && !isAdmin && (
                <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50'>
                    <div className='bg-[#1a1a1a] rounded-2xl max-w-md w-full mx-4 border border-white/10 shadow-2xl overflow-hidden'>
                        
                        {addStep === "setup" && (
                            <>
                                <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <div className='size-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
                                            <KeyRound className='size-5 text-amber-400' />
                                        </div>
                                        <div>
                                            <h2 className='text-lg font-bold text-white'>Set PIN - Required</h2>
                                            <p className='text-xs text-gray-400'>Create 4-digit PIN to use wallet</p>
                                        </div>
                                    </div>
                                    <button onClick={closeModal} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                        <X className='size-5 text-gray-400' />
                                    </button>
                                </div>

                                <div className='p-6'>
                                    <p className='text-sm text-gray-400 mb-4 text-center'>
                                        Create a 4-digit PIN to secure your wallet transactions
                                    </p>
                                    
                                    <div className='text-center mb-6'>
                                        <div className='flex justify-center gap-3'>
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className='w-12 h-12 bg-[#252525] border border-white/20 rounded-lg flex items-center justify-center text-xl font-bold text-white'
                                                >
                                                    {pin[i] ? "•" : ""}
                                                </div>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            className="absolute opacity-0 pointer-events-none"
                                            value={pin}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                setPinState(val);
                                            }}
                                            autoFocus
                                        />
                                    </div>

                                    <div className='grid grid-cols-3 gap-3 mb-6'>
                                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    if (key === "del") {
                                                        setPinState(pin.slice(0, -1));
                                                    } else if (key && pin.length < 4) {
                                                        setPinState(pin + key);
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
                                        onClick={handleSetupPin}
                                        disabled={pin.length !== 4}
                                        className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                    >
                                        Set PIN
                                    </Button>
                                    <button
                                        onClick={() => {
                                            if (forgotPinAttempts >= 3) {
                                                toast.error("Too many failed attempts. You cannot submit more PIN reset requests.");
                                                return;
                                            }
                                            setShowForgotPin(true);
                                        }}
                                        className={`w-full text-sm transition-colors mt-2 flex items-center justify-center gap-1 ${forgotPinAttempts >= 3 ? 'text-red-500 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                                        disabled={forgotPinAttempts >= 3}
                                    >
                                        <AlertCircle className='size-3' /> {displayText}
                                    </button>
                                </div>
                            </>
                        )}

                        {addStep === "amount" && (
                            <>
                                <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                                    <h2 className='text-lg font-bold text-white'>Add Money to Wallet</h2>
                                    <button onClick={closeModal} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                        <X className='size-5 text-gray-400' />
                                    </button>
                                </div>

                                <div className='p-6'>
                                    <div className='flex items-center gap-3 p-4 bg-[#252525] rounded-xl mb-6'>
                                        <div className='size-12 bg-emerald-500/20 rounded-lg flex items-center justify-center'>
                                            <ShieldCheck className='size-6 text-emerald-400' />
                                        </div>
                                        <div className='flex-1'>
                                            <p className='font-bold text-white'>Add ₹{amount || "0"}</p>
                                            <p className='text-sm text-gray-400'>Secure Transaction</p>
                                        </div>
                                    </div>

                                    <p className='text-sm text-gray-400 mb-4'>Select amount</p>
                                    <div className='grid grid-cols-2 gap-3 mb-6'>
                                        {quickAmounts.map((amt) => (
                                            <button
                                                key={amt}
                                                onClick={() => setAmount(amt.toString())}
                                                className={`p-4 rounded-xl border-2 font-bold transition-all ${
                                                    amount === amt.toString()
                                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                        : "border-white/10 bg-white/5 text-white hover:border-white/20"
                                                }`}
                                            >
                                                ₹{amt}
                                            </button>
                                        ))}
                                    </div>

                                    <div className='mb-6'>
                                        <label className='text-sm text-gray-400 mb-2 block'>Or enter custom amount</label>
                                        <div className='relative h-14'>
                                            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl z-10'>₹</span>
                                            <input
                                                type='number'
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder='0'
                                                min={1}
                                                max={MAX_WALLET_BALANCE - balance}
                                                className='w-full h-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]'
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleAddMoney}
                                        disabled={!amount || parseFloat(amount) <= 0}
                                        className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </>
                        )}

                        {addStep === "pin" && (
                            <>
                                <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <div className='size-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
                                            <KeyRound className='size-5 text-amber-400' />
                                        </div>
                                        <div>
                                            <h2 className='text-lg font-bold text-white'>Enter PIN</h2>
                                            <p className='text-xs text-gray-400'>Verify your transaction</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setAddStep("amount")} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                        <X className='size-5 text-gray-400' />
                                    </button>
                                </div>

                                <div className='p-6'>
                                    <div className='text-center mb-6'>
                                        <p className='text-sm text-gray-400 mb-4'>Enter your 4-digit PIN to confirm</p>
                                        <p className='text-2xl font-bold text-white mb-4'>₹{amount}</p>
                                        <div className='flex justify-center gap-3'>
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => document.getElementById('wallet-pin-input')?.focus()}
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
                                            id="wallet-pin-input"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            className="absolute opacity-0 pointer-events-none"
                                            value={pin}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                setPinState(val);
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
                                                        setPinState(pin.slice(0, -1));
                                                        setPinError("");
                                                    } else if (key && pin.length < 4) {
                                                        setPinState(pin + key);
                                                        setPinError("");
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
                                    <button
                                        onClick={() => {
                                            if (forgotPinAttempts >= 3) {
                                                toast.error("Too many failed attempts. You cannot submit more PIN reset requests.");
                                                return;
                                            }
                                            setShowForgotPin(true);
                                        }}
                                        className={`w-full text-sm transition-colors mt-3 flex items-center justify-center gap-1 ${forgotPinAttempts >= 3 ? 'text-red-500 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                                        disabled={forgotPinAttempts >= 3}
                                    >
                                        <AlertCircle className='size-3' /> {displayText}
                                    </button>
                                </div>
                            </>
                        )}

                        {addStep === "processing" && (
                            <div className='p-12 text-center'>
                                <div className='size-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center'>
                                    <Loader2 className='size-8 text-emerald-400 animate-spin' />
                                </div>
                                <h2 className='text-xl font-bold text-white mb-2'>Processing Payment</h2>
                                <p className='text-gray-400'>Adding ₹{amount} to wallet...</p>
                            </div>
                        )}

                        {addStep === "success" && (
                            <div className='p-12 text-center'>
                                <div className='size-16 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center'>
                                    <ShieldCheck className='size-8 text-emerald-400' />
                                </div>
                                <h2 className='text-xl font-bold text-white mb-2'>Payment Successful!</h2>
                                <p className='text-gray-400 mb-6'>₹{amount} added to your wallet</p>
                                <Button
                                    onClick={closeModal}
                                    className='w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl'
                                >
                                    Done
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {modalType === "clearConfirm" && (
                <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50'>
                    <div className='bg-[#1a1a1a] rounded-2xl max-w-md w-full mx-4 border border-white/10 shadow-2xl overflow-hidden'>
                        <div className='p-6 text-center'>
                            <div className='size-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center'>
                                <Trash2 className='size-8 text-red-400' />
                            </div>
                            <h2 className='text-xl font-bold text-white mb-2'>Clear Transactions?</h2>
                            <p className='text-gray-400 mb-6'>This will remove all transaction history. This action cannot be undone.</p>
                            <div className='flex gap-3'>
                                <Button
                                    onClick={() => setModalType(null)}
                                    className='flex-1 bg-white/10 hover:bg-white/20 text-white font-bold h-12 rounded-xl'
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={confirmClearTransactions}
                                    className='flex-1 bg-red-500 hover:bg-red-400 text-white font-bold h-12 rounded-xl'
                                >
                                    Clear All
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showForgotPin && (
                <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50'>
                    <div className='bg-[#1a1a1a] rounded-2xl max-w-md w-full mx-4 border border-white/10 shadow-2xl overflow-hidden'>
                        {forgotPinStep === "pin" ? (
                            <>
                                <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <div className='size-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
                                            <KeyRound className='size-5 text-amber-400' />
                                        </div>
                                        <div>
                                            <h2 className='text-lg font-bold text-white'>Reset Wallet PIN</h2>
                                            <p className='text-xs text-gray-400'>Choose your new 4-digit PIN</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowForgotPin(false); setForgotPinNewPin(""); }} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                        <X className='size-5 text-gray-400' />
                                    </button>
                                </div>
                                <div className='p-6'>
                                    <p className='text-sm text-gray-400 mb-4 text-center'>
                                        Select 4 digits for your new wallet PIN
                                    </p>
                                    <div className='flex justify-center items-center gap-2 mb-4'>
                                        <button
                                            onClick={() => setShowForgotPinDigits(!showForgotPinDigits)}
                                            className='flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors'
                                        >
                                            {showForgotPinDigits ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                            {showForgotPinDigits ? "Hide" : "Show"}
                                        </button>
                                    </div>
                                    <div className='text-center mb-6'>
                                        <div className='flex justify-center gap-3'>
                                            {[0, 1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => document.getElementById('forgot-pin-input')?.focus()}
                                                    className='w-12 h-12 bg-[#252525] border border-white/20 rounded-lg flex items-center justify-center text-xl font-bold text-white cursor-pointer'
                                                >
                                                    {forgotPinNewPin[i] ? (showForgotPinDigits ? forgotPinNewPin[i] : "•") : ""}
                                                </div>
                                            ))}
                                        </div>
                                        <input
                                            id="forgot-pin-input"
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={4}
                                            className="absolute opacity-0 pointer-events-none"
                                            value={forgotPinNewPin}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                                setForgotPinNewPin(val);
                                            }}
                                            autoFocus
                                        />
                                    </div>
                                    <div className='grid grid-cols-3 gap-3 mb-6'>
                                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    if (key === "del") {
                                                        setForgotPinNewPin(forgotPinNewPin.slice(0, -1));
                                                    } else if (key && forgotPinNewPin.length < 4) {
                                                        setForgotPinNewPin(forgotPinNewPin + key);
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
                                        onClick={handleForgotPinSubmit}
                                        disabled={forgotPinNewPin.length !== 4}
                                        className='w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                    >
                                        Continue
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                                    <div className='flex items-center gap-3'>
                                        <div className='size-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
                                            <ShieldCheck className='size-5 text-amber-400' />
                                        </div>
                                        <div>
                                            <h2 className='text-lg font-bold text-white'>Verify It's You</h2>
                                            <p className='text-xs text-gray-400'>Enter your account password</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setShowForgotPin(false); setForgotPinStep("pin"); setForgotPinNewPin(""); setForgotPinPass(""); }} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                        <X className='size-5 text-gray-400' />
                                    </button>
                                </div>
                                <div className='p-6'>
                                    <p className='text-sm text-gray-400 mb-4'>
                                        For security, verify your identity before submitting the PIN reset request.
                                    </p>
                                    <div className='relative mb-3'>
                                        <input
                                            type={showForgotPass ? "text" : "password"}
                                            value={forgotPinPass}
                                            onChange={(e) => setForgotPinPass(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleForgotPinVerify()}
                                            className='w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50'
                                            placeholder="Enter your password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotPass(!showForgotPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showForgotPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                        </button>
                                    </div>
                                    {forgotPinAttempts > 0 && (
                                        <p className="text-xs text-amber-400 mb-3">
                                            {3 - forgotPinAttempts} attempt(s) remaining
                                        </p>
                                    )}
                                    <div className='flex gap-3'>
                                        <Button
                                            onClick={() => { setShowForgotPin(false); setForgotPinStep("pin"); setForgotPinNewPin(""); setForgotPinPass(""); }}
                                            variant="ghost"
                                            className='flex-1 text-gray-400 hover:text-white h-12 rounded-xl'
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleForgotPinVerify}
                                            disabled={submittingRequest || !forgotPinPass}
                                            className='flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                        >
                                            {submittingRequest ? <Loader2 className='size-4 animate-spin' /> : "Submit Request"}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
