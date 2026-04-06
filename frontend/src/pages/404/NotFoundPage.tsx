import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const NotFoundPage = () => {
    return (
        <div className='h-screen bg-base-300 flex items-center justify-center'>
            <div className='text-center'>
                <h1 className='text-6xl font-bold text-primary mb-4'>404</h1>
                <p className='text-xl text-base-content/60 mb-6'>Page not found</p>
                <Link to='/' className='inline-flex items-center gap-2 text-primary hover:underline'>
                    <Home className='size-4' /> Go Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;