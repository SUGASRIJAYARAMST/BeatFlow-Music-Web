import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import LeftSidebar from "./LeftSidebar";

export const MobileSidebar = () => {
    const [open, setOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="md:hidden size-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                aria-label="Open menu"
            >
                <Menu className="size-5" />
            </button>

            {open && createPortal(
                <div className="fixed inset-0 md:hidden" style={{ zIndex: 999999 }}>
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setOpen(false)}
                    />
                    <div
                        className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] shadow-2xl"
                        style={{
                            animation: "slideInRight 0.25s ease-out forwards",
                            zIndex: 1000000,
                        }}
                    >
                        <div className="relative h-full bg-[#121212] border-r border-white/10" data-theme="forest">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="absolute top-3 right-3 size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                style={{ zIndex: 1000001 }}
                                aria-label="Close menu"
                            >
                                <X className="size-4 text-white" />
                            </button>
                            <LeftSidebar />
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};
