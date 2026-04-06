import { useEffect, useState } from "react";
import { Button } from "../ui/button";

const STORAGE_KEY = "beatflow_reload_count";
const COOLDOWN_KEY = "beatflow_cooldown_end";
const MAX_RELOADS = 50;
const COOLDOWN_MS = 5000;

function getReloadData(): { count: number; timestamp: number } {
    try {
        const data = sessionStorage.getItem(STORAGE_KEY);
        if (!data) return { count: 0, timestamp: Date.now() };
        const parsed = JSON.parse(data);
        if (Date.now() - parsed.timestamp > COOLDOWN_MS) return { count: 0, timestamp: Date.now() };
        return parsed;
    } catch {
        return { count: 0, timestamp: Date.now() };
    }
}

function setReloadData(count: number) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ count, timestamp: Date.now() }));
    } catch {}
}

function getCooldownEnd(): number {
    try {
        return Number(sessionStorage.getItem(COOLDOWN_KEY)) || 0;
    } catch {
        return 0;
    }
}

function setCooldownEnd(end: number) {
    try {
        sessionStorage.setItem(COOLDOWN_KEY, String(end));
    } catch {}
}

function clearCooldown() {
    try {
        sessionStorage.removeItem(COOLDOWN_KEY);
    } catch {}
}

export default function ReloadGuard({ children }: { children: React.ReactNode }) {
    const [blocked, setBlocked] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        const cooldownEnd = getCooldownEnd();
        const now = Date.now();
        if (cooldownEnd > now) {
            const remaining = Math.ceil((cooldownEnd - now) / 1000);
            setBlocked(true);
            setCountdown(remaining);

            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        clearCooldown();
                        setReloadData(0);
                        setBlocked(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }

        const { count } = getReloadData();
        if (count >= MAX_RELOADS) {
            const cooldownEnd = Date.now() + COOLDOWN_MS;
            setCooldownEnd(cooldownEnd);
            setBlocked(true);
            setCountdown(Math.ceil(COOLDOWN_MS / 1000));

            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        clearCooldown();
                        setReloadData(0);
                        setBlocked(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }

        const newCount = count + 1;
        setReloadData(newCount);

        const resetTimer = setTimeout(() => {
            setReloadData(0);
        }, 3000);

        return () => clearTimeout(resetTimer);
    }, []);

    if (blocked) {
        return (
            <div className='h-screen w-full flex flex-col items-center justify-center bg-base-300 text-base-content p-6'>
                <h1 className='text-2xl font-bold mb-2'>Too many reloads</h1>
                <p className='text-base-content/60 mb-4'>Please wait {countdown} second{countdown !== 1 ? "s" : ""} before refreshing again.</p>
                <Button disabled>
                    {countdown > 0 ? `Wait ${countdown}s...` : "Reloading..."}
                </Button>
            </div>
        );
    }

    return <>{children}</>;
}
