import { useEffect } from "react";
import { useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import { Loader } from "lucide-react";

const AuthCallbackPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();

    useEffect(() => {
        const syncUser = async () => {
            if (!user) return;
            try {
                await axiosInstance.post("/auth/callback", {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    imageUrl: user.imageUrl,
                    primaryEmail: user.primaryEmailAddress?.emailAddress,
                });
                navigate("/");
            } catch (error) {
                console.error("Auth callback error:", error);
                navigate("/");
            }
        };
        syncUser();
    }, [user, navigate]);

    return (
        <div className='h-screen w-full flex items-center justify-center bg-base-300'>
            <Loader className='size-8 text-primary animate-spin' />
        </div>
    );
};

export default AuthCallbackPage;