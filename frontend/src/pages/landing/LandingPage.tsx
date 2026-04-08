import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser, SignInButton, SignUpButton } from "@clerk/react";
import { Music, Shield, Zap, ArrowRight, Play, X, ListMusic, Heart, Search, Headphones } from "lucide-react";

const TiltCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState({});
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        setStyle({ transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)` });
    }, []);
    const handleMouseLeave = useCallback(() => {
        setStyle({ transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)" });
    }, []) ;
    return (
        <div ref={ref} className={className} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ transition: "transform 0.3s ease", ...style }}>
            {children}
        </div>
    );
};

const LandingPage = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [showFeatures, setShowFeatures] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => { if (user) navigate("/"); }, [user, navigate]);
    useEffect(() => { document.body.style.overflow = showFeatures ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [showFeatures]);
    useEffect(() => { const i = setInterval(() => setCurrentStep(p => (p + 1) % 4), 3000); return () => clearInterval(i); }, []);

    const steps = [
        { icon: Search, title: "Discover", desc: "Find your next favorite song" },
        { icon: Play, title: "Play", desc: "Instant, high-quality streaming" },
        { icon: Heart, title: "Love", desc: "Save what moves you" },
        { icon: ListMusic, title: "Create", desc: "Build your perfect playlists" },
    ];

    return (
        <div data-theme="forest" className='h-screen bg-gradient-to-br from-base-300 via-base-200 to-base-300 text-base-content overflow-hidden flex flex-col'>

            <div className='fixed inset-0 pointer-events-none'>
                <div className='absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl' />
                <div className='absolute bottom-1/4 right-1/4 w-72 h-72 bg-green-600/5 rounded-full blur-3xl' />
            </div>

            <div className='fixed inset-0 pointer-events-none overflow-hidden'>
                <div className='absolute' style={{ left: '10%', top: '20%', animation: 'float 5s ease-in-out infinite' }}><Music className='size-6 text-emerald-400/20 rotate-slow' /></div>
                <div className='absolute' style={{ right: '12%', top: '25%', animation: 'float 6s ease-in-out 1s infinite' }}><Zap className='size-5 text-green-400/20 bounce-subtle' /></div>
                <div className='absolute' style={{ left: '15%', bottom: '30%', animation: 'float 4.5s ease-in-out 0.5s infinite' }}><Shield className='size-5 text-lime-400/20' /></div>
                <div className='absolute' style={{ right: '18%', bottom: '25%', animation: 'float 5.5s ease-in-out 1.5s infinite' }}><Heart className='size-6 text-emerald-400/20 bounce-subtle' /></div>
                <div className='absolute' style={{ left: '50%', top: '10%', animation: 'float 7s ease-in-out 2s infinite' }}><Headphones className='size-8 text-emerald-400/10' /></div>
                <div className='absolute' style={{ right: '25%', bottom: '15%', animation: 'float 4s ease-in-out 0.8s infinite' }}><ListMusic className='size-7 text-green-400/15' /></div>
            </div>

            <nav className='relative z-50 glass-dark fade-in'>
                <div className='max-w-7xl mx-auto px-8 py-4 flex items-center justify-between'>
                    <a href='/' className='flex items-center gap-3 cursor-pointer group fade-up'>
                        <img src='/mylogo.png' alt='BeatFlow' className='size-10 rounded-xl transition-transform group-hover:scale-110 group-hover:rotate-6' />
                        <span className='text-xl font-bold bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400 bg-clip-text text-transparent'>BeatFlow</span>
                    </a>
                    <div className='flex items-center gap-3 fade-up delay-1'>
                        <SignInButton mode='modal'>
                            <button className='px-5 py-2 text-sm font-semibold text-base-content/70 hover:text-base-content transition-colors hover-lift rounded-full px-4 py-2'>Sign In</button>
                        </SignInButton>
                        <SignUpButton mode='modal'>
                            <button className='px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all hover:scale-105 active:scale-95 hover-lift'>Get Started</button>
                        </SignUpButton>
                    </div>
                </div>
            </nav>

            <main className='flex-1 flex items-start justify-center relative px-6 pt-16'>
                <div className='relative z-10 flex flex-col items-center gap-8 max-w-4xl'>
                    {/* Hero Icon */}
                    <div className='relative fade-up scale-in'>
                        <div className='absolute inset-0 bg-emerald-500/30 rounded-2xl blur-2xl animate-pulse' />
                        <img src='/headphone.webp' alt='BeatFlow' className='relative size-32 rounded-full pulse-glow' style={{ animation: 'float 3s ease-in-out infinite' }} />
                    </div>

                    {/* Title */}
                    <div className='text-center fade-up delay-1'>
                        <h1 className='text-5xl font-bold mb-2 bg-gradient-to-r from-emerald-400 via-green-400 to-lime-400 bg-clip-text text-transparent gradient-animate'>
                            Welcome to BeatFlow
                        </h1>
                        <p className='text-base-content/60 text-lg'>Your music, your way</p>
                    </div>

                    {/* Buttons */}
                    <div className='flex items-center gap-4 fade-up delay-2'>
                        <SignUpButton mode='modal'>
                            <button className='group relative px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 overflow-hidden hover-lift'>
                                <div className='absolute inset-0 shimmer' />
                                <span className='relative flex items-center gap-2'>
                                    Start Listening Free
                                    <ArrowRight className='size-5 group-hover:translate-x-1 transition-transform' />
                                </span>
                            </button>
                        </SignUpButton>
                        <TiltCard className='glass rounded-2xl cursor-pointer hover:bg-white/5 transition-all border-glow hover-lift'>
                            <button onClick={() => setShowFeatures(true)} className='flex items-center gap-2 px-6 py-3'>
                                <Play className='size-5 text-emerald-400' />
                                <span className='font-medium'>Learn More</span>
                            </button>
                        </TiltCard>
                    </div>

                    {/* Step Cards */}
                    <div className='grid grid-cols-4 gap-4 max-w-3xl'>
                        {steps.map((step, i) => (
                            <div 
                                key={step.title} 
                                className={`
                                    rounded-2xl p-4 text-center transition-all duration-500 select-none border border-white/5
                                    hover:bg-white/5 hover:border-white/10 hover-lift
                                    ${currentStep === i ? 'scale-105 border-emerald-500/30 bg-emerald-500/10' : ''}
                                    fade-up delay-${i + 3}
                                `}
                            >
                                <div className={`size-12 mx-auto mb-3 rounded-xl flex items-center justify-center transition-all duration-300 ${currentStep === i ? 'bg-emerald-500/20 scale-110' : 'bg-white/5'}`}>
                                    <step.icon className={`size-6 transition-all duration-300 ${currentStep === i ? 'text-emerald-400' : 'text-base-content/40'}`} />
                                </div>
                                <p className={`text-sm font-bold transition-all duration-300 ${currentStep === i ? 'text-emerald-400' : 'text-base-content/60'}`}>{step.title}</p>
                                <p className={`text-xs mt-1 transition-all duration-300 ${currentStep === i ? 'text-emerald-400/60' : 'text-base-content/30'}`}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <footer className='relative z-10 py-4 px-6 text-center text-base-content/40 text-sm glass-dark'>
                <p>BeatFlow 2026. Built with love for music.</p>
            </footer>

            {showFeatures && (
                <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
                    <div className='absolute inset-0 bg-black/80 backdrop-blur-sm fade-in' onClick={() => setShowFeatures(false)} />
                    <div className='relative w-full max-w-lg glass rounded-3xl p-8 scale-in border-glow'>
                        <button onClick={() => setShowFeatures(false)} className='absolute top-4 right-4 size-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all hover:scale-110'>
                            <X className='size-4' />
                        </button>
                        <div className='text-center mb-6'>
                            <div className='size-16 bg-gradient-to-br from-emerald-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 pulse-glow'>
                                <Music className='size-8 text-white' />
                            </div>
                            <h2 className='text-2xl font-bold mb-2 fade-up'>What is BeatFlow?</h2>
                            <p className='text-base-content/60 text-sm fade-up delay-1'>A music streaming app. Discover, stream, and organize your music.</p>
                        </div>
                        <div className='mb-6'>
                            <h3 className='text-lg font-semibold text-center mb-4 fade-up delay-2'>Key Features</h3>
                            <div className='grid grid-cols-2 gap-3'>
                                {[
                                    { icon: Music, title: "Stream Music", desc: "Play any song" },
                                    { icon: Search, title: "Smart Search", desc: "Find songs fast" },
                                    { icon: ListMusic, title: "Playlists", desc: "Custom playlists" },
                                    { icon: Heart, title: "Liked Songs", desc: "Save favorites" },
                                    { icon: Shield, title: "Premium", desc: "Flexible plans" },
                                    { icon: Zap, title: "Instant", desc: "No buffering" },
                                ].map((item, i) => (
                                    <div key={item.title} className={`glass rounded-xl p-3 flex items-center gap-3 hover-lift cursor-default fade-up delay-${i + 3}`}>
                                        <div className='size-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0'>
                                            <item.icon className='size-5 text-emerald-400' />
                                        </div>
                                        <div>
                                            <p className='font-semibold text-sm'>{item.title}</p>
                                            <p className='text-xs text-base-content/50'>{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='text-center fade-up delay-7'>
                            <SignUpButton mode='modal'>
                                <button className='px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 hover-lift'>
                                    Get Started Free
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
