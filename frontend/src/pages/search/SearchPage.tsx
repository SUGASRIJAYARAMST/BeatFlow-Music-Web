import { useEffect, useState, useRef, useCallback } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import { useLanguageStore } from "../../stores/useLanguageStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { SongCard } from "../../components/common/SongCard";
import { Search as SearchIcon, Music, Disc, Mic2, Radio, Waves, Bird, Album, TreeDeciduous, Guitar, Drum, Sparkles } from "lucide-react";
import { GENRES, cn, optimizeImage } from "../../lib/utils";

const GENRE_COLORS = [
    { bg: "bg-[#1DB954]/10 border-[#1DB954]/30" },
    { bg: "bg-[#E8115B]/10 border-[#E8115B]/30" },
    { bg: "bg-[#8400E7]/10 border-[#8400E7]/30" },
    { bg: "bg-[#1E3264]/10 border-[#1E3264]/30" },
    { bg: "bg-[#E13300]/10 border-[#E13300]/30" },
    { bg: "bg-[#148A08]/10 border-[#148A08]/30" },
    { bg: "bg-[#477D95]/10 border-[#477D95]/30" },
    { bg: "bg-[#BA5D07]/10 border-[#BA5D07]/30" },
    { bg: "bg-[#608108]/10 border-[#608108]/30" },
    { bg: "bg-[#477D95]/10 border-[#477D95]/30" },
    { bg: "bg-[#8D67AB]/10 border-[#8D67AB]/30" },
];

const GENRE_ICONS = [Disc, Mic2, Radio, Waves, Bird, Album, TreeDeciduous, Guitar, Drum, Sparkles, Music];

const SearchPage = () =>  {
    const [query, setQuery] = useState("");
    const { searchResults, search, isLoading } = useMusicStore();
    const { t } = useLanguageStore();
    const abortRef = useRef<AbortController | null>(null);
    const debouncedSearch = useCallback((q: string) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        search(q, abortRef.current.signal);
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => { if (query.trim()) debouncedSearch(query); }, 200);
        return () => clearTimeout(timer);
    }, [query, debouncedSearch]);
    useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

    return (
        <div className='h-full bg-[#121212]'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]'>
                <div className='p-4 md:p-8 max-w-6xl mx-auto'>
                    {/* Search Bar */}
                    <div className='relative mb-8'>
                        <SearchIcon className='absolute left-4 top-1/2 -translate-y-1/2 size-5 text-black' />
                        <input
                            type='text'
                            placeholder={t("search_placeholder")}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className='w-full pl-12 pr-6 py-3 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-white text-black placeholder:text-gray-500 text-base font-medium'
                        />
                    </div>

                    {query.trim() ? (
                        <div className="space-y-8">
                            {isLoading ? (
                                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className='bg-[#181818] rounded-2xl animate-pulse p-4'>
                                            <div className='w-full aspect-square bg-[#282828] rounded-xl mb-4' />
                                            <div className='h-4 bg-[#282828] rounded w-3/4 mb-2' />
                                            <div className='h-3 bg-[#282828] rounded w-1/2' />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {searchResults.songs.length > 0 && (
                                        <div>
                                            <h2 className='text-2xl font-bold text-white mb-4'>Songs</h2>
                                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                                                {searchResults.songs.map((song) => (
                                                    <SongCard key={song._id} song={song} songs={searchResults.songs} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {searchResults.songs.length === 0 && (
                                        <div className='text-center py-20'>
                                            <SearchIcon className='size-16 mx-auto text-gray-500 mb-4' />
                                            <h3 className="text-xl font-bold text-white mb-2">{t("no_results")}</h3>
                                            <p className='text-gray-400'>{t("try_different")}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div>
                            <h2 className='text-2xl font-bold text-white mb-4'>{t("browse_genres")}</h2>
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                                {GENRES.map((genre, i) => {
                                    const IconComponent = GENRE_ICONS[i % GENRE_ICONS.length];
                                    return (
                                        <div
                                            key={genre}
                                            onClick={() => setQuery(genre)}
                                            className={cn(
                                                "group relative h-40 rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 border backdrop-blur-md bg-[#181818]",
                                                GENRE_COLORS[i % GENRE_COLORS.length].bg
                                            )}
                                        >
                                            <div className="absolute top-3 right-3">
                                                <IconComponent className="size-8 text-white/40 group-hover:text-white/70 transition-colors" />
                                            </div>
                                            <div className="relative z-10 h-full flex items-end p-4">
                                                <span className="text-xl font-bold text-white">{genre}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default SearchPage;
