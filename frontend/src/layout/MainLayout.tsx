import { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./components/LeftSidebar";
import AudioPlayer from "./components/AudioPlayer";
import AdOverlay from "../components/common/AdOverlay";
import { PlaybackControls } from "./components/PlaybackControls";
import { usePlayerStore } from "../stores/usePlayerStore";

const MainLayout = () => {
    const volumeRef = useRef(0.7);

    useEffect(() => {
        const unsub = usePlayerStore.subscribe((state) => {
            volumeRef.current = state.volume;
        });
        return unsub;
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target instanceof HTMLElement && e.target.isContentEditable)) return;
            
            if (e.code === "Space" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                usePlayerStore.getState().togglePlay();
                return;
            }
            
            const state = usePlayerStore.getState();
            
            switch (e.code) {
                case "ArrowRight":
                    e.preventDefault();
                    if (e.shiftKey) {
                        state.playNext();
                    } else if (state.currentSong && state.currentSong.duration > 0) {
                        state.seekTo(Math.min(state.currentSong.duration, (state.currentTime || 0) + 10));
                    }
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    if (e.shiftKey) {
                        state.playPrevious();
                    } else if (state.currentSong && state.currentSong.duration > 0) {
                        state.seekTo(Math.max(0, (state.currentTime || 0) - 10));
                    }
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    state.setVolume(Math.min(1, volumeRef.current + 0.05));
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    state.setVolume(Math.max(0, volumeRef.current - 0.05));
                    break;
                case "KeyM":
                    e.preventDefault();
                    state.toggleMute();
                    break;
                case "KeyS":
                    e.preventDefault();
                    state.toggleShuffle();
                    break;
                case "KeyR":
                    e.preventDefault();
                    state.toggleRepeatMode();
                    break;
            }
        };
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, []);

    return (
        <div data-theme="forest" className='h-screen bg-main-gradient text-base-content flex flex-col overflow-hidden'>
            <div className='flex-1 flex overflow-hidden'>
                <div className='w-64 shrink-0'>
                    <LeftSidebar />
                </div>
                <main className='flex-1 overflow-hidden'>
                    <Outlet />
                </main>
            </div>
            <PlaybackControls />
            <AudioPlayer />
            <AdOverlay />
        </div>
    );
};

export default MainLayout;
