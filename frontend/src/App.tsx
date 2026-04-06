import { Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useUser, useAuth } from "@clerk/react";
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
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUploadSong from "./pages/admin/UploadSong";
import AdminUploadAlbum from "./pages/admin/UploadAlbum";
import AdminAnnouncements from "./pages/admin/Announcements";
import AdminUsers from "./pages/admin/Users";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminSettings from "./pages/admin/Settings";
import AdminPasswordRequests from "./pages/admin/PasswordRequests";
import AdminSongs from "./pages/admin/Songs";
import AdminAlbums from "./pages/admin/Albums";
import AdminOffer from "./pages/admin/Offer";

import WalletPage from "./pages/wallet/WalletPage";
import NotFoundPage from "./pages/404/NotFoundPage";
import { AuthenticateWithRedirectCallback } from "@clerk/react";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useSSE } from "./hooks/useSSE";
import { useNotificationStore } from "./stores/useNotificationStore";

function App() {
  const { user } = useUser();
  const { userId } = useAuth();
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const checkAdminStatus = useAuthStore((state) => state.checkAdminStatus);
  const fetchNotifications = useNotificationStore(
    (state) => state.fetchNotifications,
  );

  useSSE();

  useEffect(() => {
    if (userId) {
      checkAdminStatus();
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]);

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
              <Route index element={<AdminDashboard />} />
              <Route path="upload-song" element={<AdminUploadSong />} />
              <Route path="upload-album" element={<AdminUploadAlbum />} />
              <Route path="songs" element={<AdminSongs />} />
              <Route path="albums" element={<AdminAlbums />} />
              <Route path="announcements" element={<AdminAnnouncements />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route
                path="password-requests"
                element={<AdminPasswordRequests />}
              />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="offer" element={<AdminOffer />} />
            </>
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
          {/*<Route path='/library' element={<LibraryPage />} />*/}
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/albums/:albumId" element={<AlbumPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}

export default App;
