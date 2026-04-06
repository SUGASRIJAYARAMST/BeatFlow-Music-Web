import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ClerkProvider } from "@clerk/react";
import { BrowserRouter } from "react-router-dom";
import AuthProvider from "./providers/AuthProvider.tsx";
import ReloadGuard from "./components/common/ReloadGuard.tsx";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
            <AuthProvider>
                <BrowserRouter>
                    <ReloadGuard>
                        <App />
                    </ReloadGuard>
                </BrowserRouter>
            </AuthProvider>
        </ClerkProvider>
    </StrictMode>
);
