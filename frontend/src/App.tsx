import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useUser, useAuth, AuthenticateWithRedirectCallback } from "@clerk/react";
import { lazy, Suspense, useEffect } from "react";
import { useAuthStore } from "./stores/useAuthStore";
import MainLayout from "./layout/MainLayout";
import AdminLayout from "./layout/AdminLayout";
import HomePage from "./pages/home/HomePage";
import SearchPage from "./pages/search/SearchPage";
import PremiumPage from "./pages/premium/PremiumPage";
import PlaylistPage from "./pages/playlist/PlaylistPage";
import PlaylistDetailPage from "./pages/playlist/PlaylistDetailPage";
import ProfilePage from "./pages/profile/ProfilePage";
import LikedSongsPage from "./pages/liked-songs/LikedSongsPage";
import AlbumPage from "./pages/album/AlbumPage";
import AuthCallbackPage from "./pages/auth-callback/AuthCallbackPage";
import LandingPage from "./pages/landing/LandingPage";
import WalletPage from "./pages/wallet/WalletPage";
import NotFoundPage from "./pages/404/NotFoundPage";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useSSE } from "./hooks/useSSE";

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

const AdminPageLoader = () => (
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
            <Suspense fallback={<AdminPageLoader />}>
              <Route index element={<AdminDashboard />} />
              <Route path="upload-song" element={<AdminUploadSong />} />
              <Route path="upload-album" element={<AdminUploadAlbum />} />
              <Route path="songs" element={<AdminSongs />} />
              <Route path="albums" element={<AdminAlbums />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="password-requests" element={<AdminPasswordRequests />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="offer" element={<AdminOffer />} />
              <Route path="feedback" element={<AdminFeedback />} />
            </Suspense>
          )}
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/premium" element={<PremiumPage />} />
          <Route path="/playlists" element={<PlaylistPage />} />
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/liked-songs" element={<LikedSongsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/albums/:albumId" element={<AlbumPage />} />
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
