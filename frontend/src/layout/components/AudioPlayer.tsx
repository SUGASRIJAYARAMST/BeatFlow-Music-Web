import { useRef, useEffect, useCallback } from "react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import toast from "react-hot-toast";

const AudioPlayer = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSongIdRef = useRef<string | null>(null);
    const retryCountRef = useRef(0);
    const isPlayingRef = useRef(false);
    const isSeekingRef = useRef(false);
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastAppliedTimeRef = useRef(0);
    const isTransitioningRef = useRef(false);

    const {
        currentSong,
        isPlaying: storeIsPlaying ,
        volume,
        isMuted,
        currentTime,
        setIsPlaying,
        setDuration,
        setCurrentTime
    } = usePlayerStore();
    const hasRestoredRef = useRef(false);

    // Keep storeIsPlayingRef always synced
    const storeIsPlayingRef = useRef(false);
    useEffect(() => {
        storeIsPlayingRef.current = storeIsPlaying;
    }, [storeIsPlaying]);

    // Media Session API
    useEffect(() => {
        if (!("mediaSession" in navigator)) return;

        const updateMediaSession = () => {
            if (!currentSong) return;
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentSong.title,
                artist: currentSong.artist,
                album: currentSong.albumTitle || "BeatFlow",
                artwork: currentSong.imageUrl ? [
                    { src: currentSong.imageUrl, sizes: "512x512", type: "image/jpeg" }
                ] : []
            });
        };

        navigator.mediaSession.setActionHandler("play", () => usePlayerStore.getState().setIsPlaying(true));
        navigator.mediaSession.setActionHandler("pause", () => usePlayerStore.getState().setIsPlaying(false));
        navigator.mediaSession.setActionHandler("previoustrack", () => usePlayerStore.getState().playPrevious());
        navigator.mediaSession.setActionHandler("nexttrack", () => usePlayerStore.getState().playNext());
        navigator.mediaSession.setActionHandler("seekto", (details) => {
            if (details.seekTime !== undefined) usePlayerStore.getState().seekTo(details.seekTime);
        });

        updateMediaSession();
        return () => {
            ["play","pause","previoustrack","nexttrack","seekto","seekbackward","seekforward"].forEach(a =>
                navigator.mediaSession.setActionHandler(a as MediaSessionAction, null)
            );
        };
    }, [currentSong]);

    useEffect(() => {
        if (!("mediaSession" in navigator)) return;
        navigator.mediaSession.playbackState = storeIsPlaying ? "playing" : "paused";
    }, [storeIsPlaying]);

    // Hardware media keys only
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case "MediaPlayPause": e.preventDefault(); usePlayerStore.getState().togglePlay(); break;
                case "MediaNextTrack": e.preventDefault(); usePlayerStore.getState().playNext(); break;
                case "MediaPreviousTrack": e.preventDefault(); usePlayerStore.getState().playPrevious(); break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Start progress interval
    const startInterval = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || intervalRef.current) return;
        intervalRef.current = setInterval(() => {
            if (audio && !audio.paused && !audio.ended && !isSeekingRef.current) {
                setCurrentTime(audio.currentTime);
            }
        }, 250);
    }, [setCurrentTime]);

    const stopInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Load new song
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSong?._id || !currentSong?.audioUrl) return;

        if (currentSong._id === lastSongIdRef.current && audio.src === currentSong.audioUrl) {
            return;
        }

        isTransitioningRef.current = true;
        stopInterval();
        audio.pause();
        isPlayingRef.current = false;

        lastSongIdRef.current = currentSong._id;
        retryCountRef.current = 0;
        isSeekingRef.current = false;
        lastAppliedTimeRef.current = 0;

        if (currentSong.duration && currentSong.duration > 0) {
            setDuration(currentSong.duration);
        }

        audio.src = currentSong.audioUrl;
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";
        audio.load();

        const onLoadedMetadata = () => {
            const storeState = usePlayerStore.getState();
            const savedTime = storeState.currentTime;
            
            if (savedTime > 0 && hasRestoredRef.current === false) {
                audio.currentTime = savedTime;
                setCurrentTime(savedTime);
                hasRestoredRef.current = true;
            } else {
                setCurrentTime(0);
            }
            lastAppliedTimeRef.current = audio.currentTime;
        };

        audio.addEventListener("loadedmetadata", onLoadedMetadata);

        return () => {
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        };

    }, [currentSong?._id, currentSong?.audioUrl, currentSong?.duration, setDuration, setCurrentTime, stopInterval]);

    // Event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
            retryCountRef.current = 0;
        };

        const handleCanPlay = () => {
            retryCountRef.current = 0;
        };

        const handlePlaying = () => {
            isPlayingRef.current = true;
            startInterval();
        };

        const handleWaiting = () => {
            // Just let the browser buffer — don't reload
        };

        const handleEnded = () => {
            const state = usePlayerStore.getState();
            setCurrentTime(0);
            isPlayingRef.current = false;
            stopInterval();

            if (state.repeatMode === "one") {
                if (state.hasRepeatedOnce) {
                    usePlayerStore.setState({ hasRepeatedOnce: false });
                    const nextIndex = state.currentIndex + 1;
                    if (nextIndex < state.queue.length) {
                        state.setQueueAndPlay(state.queue, nextIndex);
                    } else {
                        usePlayerStore.setState({ isPlaying: false, hasRepeatedOnce: false });
                    }
                } else {
                    audio.currentTime = 0;
                    usePlayerStore.setState({ hasRepeatedOnce: true });
                    audio.play().catch(() => {});
                }
                return;
            }
            if (state.repeatMode === "all") {
                state.playNext();
                return;
            }
            state.playNext();
        };

        const handleError = () => {
            retryCountRef.current++;
            if (retryCountRef.current < 3) {
                setTimeout(() => {
                    if (audio.src) {
                        audio.load();
                        if (storeIsPlayingRef.current) {
                            audio.play().catch(() => {});
                        }
                    }
                }, 2000);
            } else {
                setIsPlaying(false);
                stopInterval();
                toast.error("Failed to load audio");
            }
        };

        const handlePause = () => {
            isPlayingRef.current = false;
            stopInterval();
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("canplay", handleCanPlay);
        audio.addEventListener("playing", handlePlaying);
        audio.addEventListener("waiting", handleWaiting);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);
        audio.addEventListener("pause", handlePause);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("canplay", handleCanPlay);
            audio.removeEventListener("playing", handlePlaying);
            audio.removeEventListener("waiting", handleWaiting);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("error", handleError);
            audio.removeEventListener("pause", handlePause);
        };
    }, [setIsPlaying, setDuration, setCurrentTime, startInterval, stopInterval]);

    // Play/pause control — single source of truth
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSong?.audioUrl) return;

        if (storeIsPlaying) {
            if (audio.paused) {
                isPlayingRef.current = true;
                audio.play().catch((err) => {
                    isPlayingRef.current = false;
                    if (err.name !== "AbortError") console.error("Play error:", err);
                });
            }
            startInterval();
        } else {
            if (!audio.paused) {
                audio.pause();
            }
            isPlayingRef.current = false;
            stopInterval();
        }
    }, [storeIsPlaying, currentSong?.audioUrl, startInterval, stopInterval]);

    // Volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // Seek
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !currentSong) return;
        const songDuration = currentSong.duration;
        if (!songDuration || songDuration <= 0) return;

        const diff = Math.abs(currentTime - audio.currentTime);
        if (diff > 1) {
            isSeekingRef.current = true;
            audio.currentTime = currentTime;
            lastAppliedTimeRef.current = currentTime;
            // Sync store to actual audio position immediately after seek
            setTimeout(() => {
                setCurrentTime(audio.currentTime);
                isSeekingRef.current = false;
            }, 200);
        }
    }, [currentTime, currentSong, setCurrentTime]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
            if (preloadAudioRef.current) {
                preloadAudioRef.current.pause();
                preloadAudioRef.current.src = "";
            }
            stopInterval();
            if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
        };
    }, [stopInterval]);

    // Preload next song
    useEffect(() => {
        if (!currentSong) return;
        const state = usePlayerStore.getState();
        const { queue, currentIndex, isShuffle } = state;
        if (queue.length <= 1) return;

        let nextIndex = currentIndex + 1;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * queue.length);
        }

        if (nextIndex < queue.length && queue[nextIndex]?.audioUrl) {
            if (preloadAudioRef.current) {
                preloadAudioRef.current.pause();
                preloadAudioRef.current.src = "";
            }
            preloadAudioRef.current = new Audio();
            preloadAudioRef.current.preload = "auto";
            preloadAudioRef.current.src = queue[nextIndex].audioUrl;
        }
    }, [currentSong?._id]);

    return <audio ref={audioRef} preload="auto" className="hidden" />;
};

export default AudioPlayer;
