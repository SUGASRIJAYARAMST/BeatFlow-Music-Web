import { Component, type ReactNode } from "react";
import { Button } from "../ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    canReload: boolean ;
    countdown: number;
}

const STORAGE_KEY = "beatflow_error_reloads";
const COOLDOWN_KEY = "beatflow_error_cooldown";
const MAX_RELOADS = 10;
const COOLDOWN_MS = 5000;

function getReloadCount(): number {
    try {
        const data = sessionStorage.getItem(STORAGE_KEY);
        if (!data) return 0;
        const { count, timestamp } = JSON.parse(data);
        if (Date.now() - timestamp > COOLDOWN_MS) return 0;
        return count;
    } catch {
        return 0;
    }
}

function setReloadCount(count: number) {
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

export class ErrorBoundary extends Component<Props, State> {
    private countdownInterval: ReturnType<typeof setInterval> | null = null;

    constructor(props: Props) {
        super(props);
        const cooldownEnd = getCooldownEnd();
        const now = Date.now();
        const isCoolingDown = cooldownEnd > now;
        const remaining = isCoolingDown ? Math.ceil((cooldownEnd - now) / 1000) : 0;
        this.state = { hasError: false, error: null, canReload: !isCoolingDown, countdown: remaining };
    }

    static getDerivedStateFromError(error: Error): State {
        console.error("ErrorBoundary caught:", error);
        console.error("Stack:", error.stack);
        return { hasError: true, error, canReload: true, countdown: 0 };
    }

    handleReload = () => {
        const count = getReloadCount();
        if (count >= MAX_RELOADS) {
            const cooldownEnd = Date.now() + COOLDOWN_MS;
            setCooldownEnd(cooldownEnd);
            const seconds = Math.ceil(COOLDOWN_MS / 1000);
            this.setState({ canReload: false, countdown: seconds });
            this.countdownInterval = setInterval(() => {
                this.setState((prev) => {
                    if (prev.countdown <= 1) {
                        if (this.countdownInterval) clearInterval(this.countdownInterval);
                        clearCooldown();
                        setReloadCount(0);
                        window.location.reload();
                        return { countdown: 0, canReload: true } as Pick<State, "canReload" | "countdown">;
                    }
                    return { countdown: prev.countdown - 1 } as Pick<State, "canReload" | "countdown">;
                });
            }, 1000);
            return;
        }
        setReloadCount(count + 1);
        window.location.reload();
    };

    componentWillUnmount() {
        if (this.countdownInterval) clearInterval(this.countdownInterval);
    }

    render() {
        console.log("ErrorBoundary render, hasError:", this.state.hasError);
        if (this.state.hasError) {
            const { canReload, countdown } = this.state;
            const reloadCount = getReloadCount();
            return (
                <div className='h-screen w-full flex flex-col items-center justify-center bg-base-300 text-base-content p-6'>
                    <h1 className='text-2xl font-bold mb-2'>Something went wrong</h1>
                    <p className='text-base-content/60 mb-4'>{this.state.error?.message}</p>
                    <Button onClick={this.handleReload} disabled={!canReload}>
                        {countdown > 0 ? `Wait ${countdown}s...` : "Reload Page"}
                    </Button>
                    {reloadCount > 0 && reloadCount < MAX_RELOADS && (
                        <p className='text-xs text-base-content/30 mt-2'>Reload attempts: {reloadCount}/{MAX_RELOADS}</p>
                    )}
                    {reloadCount >= MAX_RELOADS && (
                        <p className='text-xs text-yellow-500 mt-2'>Too many reloads. Please wait.</p>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
