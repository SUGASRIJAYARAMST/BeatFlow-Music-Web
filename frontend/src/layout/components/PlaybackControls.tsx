import { useRef, useState, useEffect } from "react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX } from "lucide-react";
import { cn, formatDuration, optimizeImage } from "../../lib/utils";

export const PlaybackControls = () => {
    const { currentSong, isPlaying, isShuffle, repeatMode, volume, isMuted, currentTime, duration, togglePlay, playNext, playPrevious, toggleShuffle, toggleRepeatMode, setVolume, toggleMute, seekTo } = usePlayerStore();
    const progressRef = useRef<HTMLDivElement>(null);
    const volumeRef = useRef<HTMLDivElement>(null);
    const [isDraggingProgress, setIsDraggingProgress] = useState(false);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);
    const [hoverProgress, setHoverProgress] = useState<number | null>(null);
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(percent * duration);
    };

    const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!volumeRef.current) return;
        const rect = volumeRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setVolume(percent);
    };

    useEffect(() => {
        if (!isDraggingProgress) return;
        const handleMove = (e: MouseEvent) => {
            if (!progressRef.current || !duration) return;
            const rect = progressRef.current.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            seekTo(p * duration);
        };
        const handleUp = () => setIsDraggingProgress(false);
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isDraggingProgress, duration, seekTo]);

    useEffect(() => {
        if (!isDraggingVolume) return;
        const handleMove = (e: MouseEvent) => {
            if (!volumeRef.current) return;
            const rect = volumeRef.current.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setVolume(p);
        };
        const handleUp = () => setIsDraggingVolume(false);
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isDraggingVolume, setVolume]);
    if (!currentSong) return null;
    return (
        <div className='h-20 bg-base-200/95 backdrop-blur-md border-t border-base-100/50 px-4 flex items-center justify-between shadow-2xl'>
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
                    <div ref={progressRef} className='flex-1 h-1.5 bg-base-content/10 rounded-full cursor-pointer group relative border border-base-content/5' onClick={handleProgressClick} onMouseDown={() => setIsDraggingProgress(true)} onMouseMove={(e) => { if (!progressRef.current || !duration) return; const rect = progressRef.current.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); setHoverProgress(p * duration); }} onMouseLeave={() => setHoverProgress(null)}>
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
    );
};
