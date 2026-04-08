import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser, SignInButton } from "@clerk/react";
import { Home, Search, Zap, Heart, ListMusic, User, Library, Disc, LayoutDashboard, Wallet, Lock } from "lucide-react";
import { useAuthStore } from "../../stores/useAuthStore";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import { useLanguageStore } from "../../stores/useLanguageStore";

const LeftSidebar = () => {
    const { user } = useUser();
    const location = useLocation();
    const { albums, fetchAlbums } = useMusicStore();
    const { playlists, fetchPlaylists } = usePlaylistStore() ;
    const isPremium = useSubscriptionStore((state) => state.isPremium);
    const subscriptionPlan = useSubscriptionStore((state) => state.subscriptionPlan);
    const subscriptionExpiry = useSubscriptionStore((state) => state.subscriptionExpiry);
    const checkSubscription = useSubscriptionStore((state) => state.checkSubscription);
    const isAdmin = useAuthStore((state) => state.isAdmin);
    const checkAdminStatus = useAuthStore((state) => state.checkAdminStatus);
    const authUser = useAuthStore((state) => state.user);
    const fetchUserProfile = useAuthStore((state) => state.fetchUserProfile);
    const { t } = useLanguageStore();

    useEffect(() => {
        fetchAlbums(true);
        if (user) {
            fetchPlaylists();
            checkSubscription();
            fetchUserProfile();
        }
    }, [fetchAlbums, fetchPlaylists, checkSubscription, fetchUserProfile, user]);

    const showAdmin = authUser?.role === "admin";
    const isProUser = isPremium || authUser?.role === "admin";

     const allLinks = [
         { to: "/home", icon: Home, label: t("home") },
         { to: "/search", icon: Search, label: t("search") },
         { to: "/premium", icon: Zap, label: t("pro"), highlight: true },
         { to: "/liked-songs", icon: Heart, label: t("liked_songs"), requireAuth: true },
         { to: "/wallet", icon: Wallet, label: "Wallet", requireAuth: true },
         { to: "/playlists", icon: ListMusic, label: t("playlists"), requireAuth: true },
         { to: "/profile", icon: User, label: t("profile"), requireAuth: true },
          ...(showAdmin ? [{ to: "/admin", icon: LayoutDashboard, label: t("admin_dashboard") }] : []),
     ];

      return (
          <div className='h-full bg-[#121212] flex flex-col border-r border-base-100/10'>
              <div className='p-4'>
                  <h1 className='text-xl font-bold text-gradient mb-6'>BeatFlow</h1>
                  <nav className='space-y-1'>
                      {allLinks.map((link) => (
                          <Link
                              key={link.to}
                              to={link.to}
                              className={cn(
                                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                                  link.highlight
                                      ? "text-emerald-400 hover:bg-emerald-500/10"
                                      : "text-white/80 hover:text-white hover:bg-white/5",
                                  location.pathname === link.to && "bg-emerald-500/10 text-emerald-400 shadow-sm"
                              )}
                          >
                              <link.icon className='size-5' />
                              {link.label}
                          </Link>
                      ))}
                  </nav>
              </div>
              
                <div className='flex-1 border-t border-white/10 px-4 pt-4 flex flex-col min-h-0'>
                    <div className='flex items-center gap-2 mb-3'>
                        <Library className='size-5 text-white/60' />
                        <span className='text-sm font-semibold text-white/60'>{t("your_library")}</span>
                   </div>
                   <ScrollArea className='flex-1 min-h-0'>
                          <div className='space-y-1'>
                              {user && playlists.map((pl) => (
                                   <Link
                                       key={pl._id}
                                       to={`/playlists/${pl._id}`}
                                       className={cn(
                                           "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300",
                                           location.pathname === `/playlists/${pl._id}`
                                               ? "bg-white/10 text-white"
                                               : "text-white/80 hover:text-white hover:bg-white/5"
                                       )}
                                   >
                                       <ListMusic className='size-4 shrink-0 text-emerald-400/60' />
                                       <span className='truncate'>{pl.name}</span>
                                   </Link>
                               ))}
                               {Array.isArray(albums) && albums.map((album) => (
                                   <Link
                                       key={album._id}
                                       to={`/albums/${album._id}`}
                                       className={cn(
                                           "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300",
                                           location.pathname === `/albums/${album._id}`
                                               ? "bg-white/10 text-white"
                                               : "text-white/80 hover:text-white hover:bg-white/5"
                                       )}
                                  >
                                      <Disc className='size-4 shrink-0 text-emerald-400/60' />
                                      <span className='truncate'>{album.title}</span>
                                      {album.isPremium && !isProUser && <Lock className='size-3 shrink-0 text-amber-400/60' />}
                                  </Link>
                              ))}
                          </div>
                       </ScrollArea>
               </div>

              {!user && (
                 <div className='px-4 pb-2'>
                      <SignInButton mode='modal'>
                          <button className='flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-base-content/60 hover:text-base-content hover:bg-base-300 transition-colors w-full'>
                             <Heart className='size-5' />
                             {t("liked_songs")}
                         </button>
                     </SignInButton>
                 </div>
             )}
         </div>
     );
};

export default LeftSidebar;
