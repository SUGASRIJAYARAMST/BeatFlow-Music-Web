import { useRef, useState, useEffect } from "react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ChevronDown, ChevronUp } from "lucide-react";
import { cn, formatDuration, optimizeImage } from "../../lib/utils";

export const PlaybackControls = () => {
    const { currentSong, isPlaying, isShuffle, repeatMode, volume, isMuted, currentTime, duration, togglePlay, playNext, playPrevious, toggleShuffle, toggleRepeatMode, setVolume, toggleMute, seekTo } = usePlayerStore();
    const desktopProgressRef = useRef<HTMLDivElement>(null);
    const mobileProgressRef = useRef<HTMLDivElement>(null);
    const volumeRef = useRef<HTMLDivElement>(null);
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [hoverProgress, setHoverProgress] = useState<number | null>(null);
    const [showVolume, setShowVolume] = useState(false);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleDesktopProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!desktopProgressRef.current || !duration) return;
        const rect = desktopProgressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(percent * duration);
    };

    const handleMobileProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!mobileProgressRef.current || !duration) return;
        const rect = mobileProgressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(percent * duration);
    };

    const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!volumeRef.current) return;
        const rect = volumeRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setVolume(percent);
    };

    const handleMobileProgressTouch = (e: React.TouchEvent<HTMLDivElement>) =>  {
        if (!mobileProgressRef.current || !duration || !e.touches[0]) return;
        const rect = mobileProgressRef.current.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
        seekTo(p * duration);
    };

    const handleVolumeTouch = (e: React.TouchEvent<HTMLDivElement>) => {
        if (!volumeRef.current || !e.touches[0]) return;
        const rect = volumeRef.current.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
        setVolume(p);
    };

    useEffect(() => {
        if (!isDraggingProgress) return;
        const handleMove = (e: MouseEvent | TouchEvent) => {
            const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
            const ref = window.innerWidth < 768 ? mobileProgressRef.current : desktopProgressRef.current;
            if (!ref || !duration) return;
            const rect = ref.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            seekTo(p * duration);
        };
        const handleUp = () => setIsDraggingProgress(false);
        window.addEventListener("mousemove", handleMove as any);
        window.addEventListener("touchmove", handleMove as any);
        window.addEventListener("mouseup", handleUp);
        window.addEventListener("touchend", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove as any);
            window.removeEventListener("touchmove", handleMove as any);
            window.removeEventListener("mouseup", handleUp);
            window.removeEventListener("touchend", handleUp);
        };
    }, [isDraggingProgress, duration, seekTo]);

    useEffect(() => {
        if (!isDraggingVolume) return;
        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!volumeRef.current) return;
            const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
            const rect = volumeRef.current.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            setVolume(p);
        };
        const handleUp = () => setIsDraggingVolume(false);
        window.addEventListener("mousemove", handleMove as any);
        window.addEventListener("touchmove", handleMove as any);
        window.addEventListener("mouseup", handleUp);
        window.addEventListener("touchend", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove as any);
            window.removeEventListener("touchmove", handleMove as any);
            window.removeEventListener("mouseup", handleUp);
            window.removeEventListener("touchend", handleUp);
        };
    }, [isDraggingVolume, setVolume]);

    if (!currentSong) return null;

    return (
        <div className='bg-base-200/95 backdrop-blur-md border-t border-base-100/50 shadow-2xl'>
            {/* Mobile: compact layout */}
            <div className='md:hidden flex items-center gap-2 px-3 py-2'>
                <img src={optimizeImage(currentSong.imageUrl, "sm")} alt={currentSong.title} className='size-10 rounded-md object-cover flex-shrink-0' />
                <div className='min-w-0 flex-1'>
                    <p className='text-xs font-medium text-base-content truncate'>{currentSong.title}</p>
                    <p className='text-[10px] text-base-content/60 truncate'>{currentSong.artist}</p>
                </div>
                <button onClick={playPrevious} className='text-base-content/60 hover:text-base-content transition-colors p-1'><SkipBack className='size-4' /></button>
                <button onClick={togglePlay} className='size-8 bg-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform'>{isPlaying ? <Pause className='size-3.5 text-primary-content' /> : <Play className='size-3.5 text-primary-content ml-0.5' />}</button>
                <button onClick={playNext} className='text-base-content/60 hover:text-base-content transition-colors p-1'><SkipForward className='size-4' /></button>
            </div>

            {/* Mobile: progress bar full width */}
            <div className='md:hidden px-3 pb-2'>
                <div className='w-full flex items-center gap-2'>
                    <span className='text-[10px] text-base-content/60 w-8 text-right tabular-nums'>{formatDuration(currentTime)}</span>
                    <div
                        ref={mobileProgressRef}
                        className='flex-1 h-6 flex items-center cursor-pointer relative touch-none select-none'
                        onClick={handleMobileProgressClick}
                        onMouseDown={(e) => {
                            setIsDraggingProgress(true);
                            handleMobileProgressClick(e);
                        }}
                        onTouchStart={(e) => {
                            setIsDraggingProgress(true);
                            handleMobileProgressTouch(e);
                        }}
                        onTouchMove={(e) => {
                            if (!isDraggingProgress) return;
                            e.preventDefault();
                            handleMobileProgressTouch(e);
                        }}
                        onTouchEnd={() => setIsDraggingProgress(false)}
                    >
                        <div className='w-full h-1 bg-base-content/10 rounded-full relative'>
                            <div className='h-full bg-primary rounded-full relative' style={{ width: `${progressPercent}%` }}>
                                <div className='absolute right-0 top-1/2 -translate-y-1/2 size-4 bg-white rounded-full shadow-lg border-2 border-primary' />
                            </div>
                        </div>
                    </div>
                    <span className='text-[10px] text-base-content/60 w-8 tabular-nums'>{formatDuration(duration)}</span>
                </div>
            </div>

            {/* Mobile: extra controls row */}
            <div className='md:hidden flex items-center justify-center gap-4 pb-2 px-3'>
                <button onClick={toggleShuffle} className={cn("text-base-content/60 hover:text-base-content transition-colors", isShuffle && "text-primary")}><Shuffle className='size-3.5' /></button>
                <button onClick={toggleRepeatMode} className={cn("text-base-content/60 hover:text-base-content transition-colors relative", repeatMode !== "none" && "text-primary")}>
                    {repeatMode === "one" ? <Repeat1 className='size-3.5' /> : <Repeat className='size-3.5' />}
                </button>
                <button onClick={() => setShowVolume(!showVolume)} className='text-base-content/60 hover:text-base-content transition-colors'>
                    {showVolume ? <ChevronDown className='size-3.5' /> : <ChevronUp className='size-3.5' />}
                </button>
            </div>

            {/* Mobile: expandable volume */}
            {showVolume && (
                <div className='md:hidden flex items-center gap-2 pb-2 px-6'>
                    <button onClick={toggleMute} className='text-base-content/60 hover:text-base-content transition-colors'>{isMuted || volume === 0 ? <VolumeX className='size-3.5' /> : <Volume2 className='size-3.5' />}</button>
                    <div ref={volumeRef} className='flex-1 h-1 bg-base-content/10 rounded-full cursor-pointer group border border-base-content/5' onClick={handleVolumeClick} onTouchStart={() => setIsDraggingVolume(true)} onTouchMove={handleVolumeTouch}>
                        <div className='h-full bg-primary rounded-full relative transition-colors' style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}><div className='absolute right-0 top-1/2 -translate-y-1/2 size-2.5 bg-primary rounded-full opacity-100 shadow' /></div>
                    </div>
                </div>
            )}

            {/* Desktop: full layout */}
            <div className='hidden md:flex h-20 items-center justify-between px-4'>
                <div className='flex items-center gap-3 w-1/4 min-w-0'><img src={optimizeImage(currentSong.imageUrl, "sm")} alt={currentSong.title} className='size-12 rounded-md object-cover flex-shrink-0' /><div className='min-w-0'><p className='text-sm font-medium text-base-content truncate'>{currentSong.title}</p><p className='text-xs text-base-content/60 truncate'>{currentSong.artist}</p></div></div>
                <div className='flex flex-col items-center gap-1 flex-1 max-w-2xl px-4'>
                    <div className='flex items-center gap-4'>
                        <button onClick={toggleShuffle} className={cn("text-base-content/60 hover:text-base-content transition-colors", isShuffle && "text-primary")}><Shuffle className='size-4' /></button>
                        <button onClick={playPrevious} className='text-base-content/60 hover:text-base-content transition-colors'><SkipBack className='size-5' /></button>
                        <button onClick={togglePlay} className='size-9 bg-primary rounded-full flex items-center justify-center hover:scale-105 transition-transform'>{isPlaying ? <Pause className='size-4 text-primary-content' /> : <Play className='size-4 text-primary-content ml-0.5' />}</button>
                        <button onClick={playNext} className='text-base-content/60 hover:text-base-content transition-colors'><SkipForward className='size-5' /></button>
                        <button onClick={toggleRepeatMode} className={cn("text-base-content/60 hover:text-base-content transition-colors relative", repeatMode !== "none" && "text-primary")}>
                            {repeatMode === "one" ? <Repeat1 className='size-4' /> : <Repeat className='size-4' />}
                        </button>
                    </div>
                    <div className='w-full flex items-center gap-2'>
                        <span className='text-xs text-base-content/60 w-10 text-right tabular-nums'>{formatDuration(currentTime)}</span>
                        <div ref={desktopProgressRef} className='flex-1 h-1.5 bg-base-content/10 rounded-full cursor-pointer group relative border border-base-content/5' onClick={handleDesktopProgressClick} onMouseDown={() => setIsDraggingProgress(true)} onMouseMove={(e) => { if (!desktopProgressRef.current || !duration) return; const rect = desktopProgressRef.current.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); setHoverProgress(p * duration); }} onMouseLeave={() => setHoverProgress(null)}>
                            <div className='h-full bg-primary group-hover:bg-primary-focus rounded-full relative transition-colors' style={{ width: `${progressPercent}%` }}><div className='absolute right-0 top-1/2 -translate-y-1/2 size-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow' /></div>
                            {hoverProgress !== null && (<div className='absolute -top-8 bg-base-100 text-base-content text-xs px-2 py-1 rounded transform -translate-x-1/2 pointer-events-none' style={{ left: `${(hoverProgress / duration) * 100}%` }}>{formatDuration(hoverProgress)}</div>)}
                        </div>
                        <span className='text-xs text-base-content/60 w-10 tabular-nums'>{formatDuration(duration)}</span>
                    </div>
                </div>
                <div className='flex items-center gap-2 w-1/4 justify-end'>
                    <button onClick={toggleMute} className='text-base-content/60 hover:text-base-content transition-colors'>{isMuted || volume === 0 ? <VolumeX className='size-4' /> : <Volume2 className='size-4' />}</button>
                    <div ref={volumeRef} className='w-24 h-1.5 bg-base-content/10 rounded-full cursor-pointer group border border-base-content/5' onClick={handleVolumeClick} onMouseDown={() => setIsDraggingVolume(true)}><div className='h-full bg-primary group-hover:bg-primary-focus rounded-full relative transition-colors' style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}><div className='absolute right-0 top-1/2 -translate-y-1/2 size-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow' /></div></div>
                </div>
            </div>
        </div>
    );
};
