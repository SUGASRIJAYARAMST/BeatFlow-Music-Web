import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useUser, AuthenticateWithRedirectCallback } from "@clerk/react";
import { lazy, Suspense } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import MainLayout from "./layout/MainLayout";
import AdminLayout from "./layout/AdminLayout";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import LandingPage from "./pages/landing/LandingPage";
import NotFoundPage from "./pages/404/NotFoundPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useSSE } from "./hooks/useSSE";

const HomePage = lazy(() => import("./pages/home/HomePage"));
const SearchPage = lazy(() => import("./pages/search/SearchPage"));
const PremiumPage = lazy(() => import("./pages/premium/PremiumPage"));
const PlaylistPage = lazy(() => import("./pages/playlist/PlaylistPage"));
const PlaylistDetailPage = lazy(() => import("./pages/playlist/PlaylistDetailPage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const LikedSongsPage = lazy(() => import("./pages/liked-songs/LikedSongsPage"));
const AlbumPage = lazy(() => import("./pages/album/AlbumPage"));
const WalletPage = lazy(() => import("./pages/wallet/WalletPage"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUploadSong = lazy(() => import("./pages/admin/UploadSong"));
const AdminUploadAlbum = lazy(() => import("./pages/admin/UploadAlbum"));
const AdminAnnouncements = lazy(() => import("./pages/admin/Announcements"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSubscriptions = lazy(() => import("./pages/admin/Subscriptions"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminPasswordRequests = lazy(() => import("./pages/admin/PasswordRequests"));
const AdminSongs = lazy(() => import("./pages/admin/Songs"));
const AdminAlbums = lazy(() => import("./pages/admin/Albums"));
const AdminOffer = lazy(() => import("./pages/admin/Offer"));
const AdminFeedback = lazy(() => import("./pages/admin/Feedback"));

const PageLoader = () => (
    <div className="flex items-center justify-center h-screen bg-base-300">
        <div className="loading loading-spinner loading-lg text-primary"></div>
    </div>
);

function App() {
  const { user } = useUser();
  const isAdmin = useAuthStore((state) => state.isAdmin);

  useSSE();

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/sso-callback"
          element={
            <AuthenticateWithRedirectCallback
              signUpForceRedirectUrl={"/auth-callback"}
            />
          }
        />
        <Route path="/auth-callback" element={<AuthCallbackPage />} />

        <Route
          path="/"
          element={user ? <Navigate to="/home" replace /> : <LandingPage />}
        />

        <Route path="/admin" element={isAdmin && user ? <AdminLayout /> : <Navigate to="/" replace />}>
          {isAdmin && user && (
            <>
              <Route index element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
              <Route path="upload-song" element={<Suspense fallback={<PageLoader />}><AdminUploadSong /></Suspense>} />
              <Route path="upload-album" element={<Suspense fallback={<PageLoader />}><AdminUploadAlbum /></Suspense>} />
              <Route path="songs" element={<Suspense fallback={<PageLoader />}><AdminSongs /></Suspense>} />
              <Route path="albums" element={<Suspense fallback={<PageLoader />}><AdminAlbums /></Suspense>} />
              <Route path="announcements" element={<Suspense fallback={<PageLoader />}><AdminAnnouncements /></Suspense>} />
              <Route path="users" element={<Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>} />
              <Route path="subscriptions" element={<Suspense fallback={<PageLoader />}><AdminSubscriptions /></Suspense>} />
              <Route path="password-requests" element={<Suspense fallback={<PageLoader />}><AdminPasswordRequests /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><AdminSettings /></Suspense>} />
              <Route path="offer" element={<Suspense fallback={<PageLoader />}><AdminOffer /></Suspense>} />
              <Route path="feedback" element={<Suspense fallback={<PageLoader />}><AdminFeedback /></Suspense>} />
            </>
          )}
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/home" element={<Suspense fallback={<PageLoader />}><HomePage /></Suspense>} />
          <Route path="/search" element={<Suspense fallback={<PageLoader />}><SearchPage /></Suspense>} />
          <Route path="/premium" element={<Suspense fallback={<PageLoader />}><PremiumPage /></Suspense>} />
          <Route path="/playlists" element={<Suspense fallback={<PageLoader />}><PlaylistPage /></Suspense>} />
          <Route path="/playlists/:id" element={<Suspense fallback={<PageLoader />}><PlaylistDetailPage /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="/liked-songs" element={<Suspense fallback={<PageLoader />}><LikedSongsPage /></Suspense>} />
          <Route path="/wallet" element={<Suspense fallback={<PageLoader />}><WalletPage /></Suspense>} />
          <Route path="/albums/:albumId" element={<Suspense fallback={<PageLoader />}><AlbumPage /></Suspense>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: '!bg-neutral-800 !text-white !border !border-neutral-700',
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 5000,
        }}
        reverseOrder={false}
      />
    </ErrorBoundary>
  );
}

export default App;
