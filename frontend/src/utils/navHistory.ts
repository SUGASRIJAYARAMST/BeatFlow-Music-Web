import { useState, useEffect, useRef, useCallback } from "react";

const HISTORY_KEY = "beatflow_nav_history";
const HISTORY_INDEX_KEY = "beatflow_nav_index";
const HAS_NAV_KEY = "beatflow_has_nav";
let isNavigating = false;

export const useNavHistory = () => {
    const [canBack, setCanBack] = useState(false);
    const [canFwd, setCanFwd] = useState(false);
    const checkRef = useRef<() => void>(() => {});

    const check = useCallback(() => {
        try {
            const raw = sessionStorage.getItem(HISTORY_KEY);
            const rawIndex = sessionStorage.getItem(HISTORY_INDEX_KEY);
            const hasNav = sessionStorage.getItem(HAS_NAV_KEY) === "true";
            
            if (!raw || !rawIndex) {
                setCanBack(false);
                setCanFwd(false);
                return;
            }
            const history: string[] = JSON.parse(raw);
            const index = parseInt(rawIndex);
            setCanBack(hasNav && index > 0);
            setCanFwd(hasNav && index < history.length - 1);
        } catch {
            setCanBack(false);
            setCanFwd(false);
        }
    }, []);

    checkRef.current = check;

    useEffect(() => {
        check();
    }, [check]);

    const push = useCallback((path: string) => {
        if (isNavigating) return;
        try {
            const raw = sessionStorage.getItem(HISTORY_KEY);
            const rawIndex = sessionStorage.getItem(HISTORY_INDEX_KEY);
            const history: string[] = raw ? JSON.parse(raw) : [];
            const index = rawIndex ? parseInt(rawIndex) : -1;
            const trimmed = history.slice(0, index + 1);
            if (trimmed[trimmed.length - 1] === path) return;
            trimmed.push(path);
            sessionStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
            sessionStorage.setItem(HISTORY_INDEX_KEY, String(trimmed.length - 1));
            if (trimmed.length > 1) {
                sessionStorage.setItem(HAS_NAV_KEY, "true");
            }
            checkRef.current();
        } catch {}
    }, []);

    const back = useCallback((): string | null => {
        try {
            const raw = sessionStorage.getItem(HISTORY_KEY);
            const rawIndex = sessionStorage.getItem(HISTORY_INDEX_KEY);
            if (!raw || !rawIndex) return null;
            const history: string[] = JSON.parse(raw);
            const index = parseInt(rawIndex);
            if (index <= 0) return null;
            const newIndex = index - 1;
            isNavigating = true;
            sessionStorage.setItem(HISTORY_INDEX_KEY, String(newIndex));
            checkRef.current();
            setTimeout(() => { isNavigating = false; }, 100);
            return history[newIndex];
        } catch { return null; }
    }, []);

    const forward = useCallback((): string | null => {
        try {
            const raw = sessionStorage.getItem(HISTORY_KEY);
            const rawIndex = sessionStorage.getItem(HISTORY_INDEX_KEY);
            if (!raw || !rawIndex) return null;
            const history: string[] = JSON.parse(raw);
            const index = parseInt(rawIndex);
            if (index >= history.length - 1) return null;
            const newIndex = index + 1;
            isNavigating = true;
            sessionStorage.setItem(HISTORY_INDEX_KEY, String(newIndex));
            checkRef.current();
            setTimeout(() => { isNavigating = false; }, 100);
            return history[newIndex];
        } catch { return null; }
    }, []);

    return { canBack, canFwd, push, back, forward };
};
