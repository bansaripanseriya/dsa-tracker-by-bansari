import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Tracker from './pages/Tracker';
import Profile from './pages/Profile';
import FindFriends from './pages/FindFriends';
import FriendProfile from './pages/FriendProfile';
import InviteLanding from './pages/InviteLanding';
import ScrollToTopButton from './components/ScrollToTopButton';
import { postAuthPath } from './utils/friends';

function TrackerWithUserKey() {
  const { user } = useAuth();
  return <Tracker key={user?.id || 'guest'} />;
}

function PublicOnly({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-page">
        <p className="auth-sub">Loading…</p>
      </div>
    );
  }
  if (token) {
    // Back to an invite link opened while signed out, otherwise home.
    return <Navigate to={postAuthPath()} replace />;
  }
  return children;
}

function ProtectedOnly({ children }) {
  const { token, loading } = useAuth();
  if (loading) {
    return (
      <div className="auth-page">
        <p className="auth-sub">Loading…</p>
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPassword />
          </PublicOnly>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicOnly>
            <ResetPassword />
          </PublicOnly>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedOnly>
            <Profile />
          </ProtectedOnly>
        }
      />
      <Route
        path="/friends/find"
        element={
          <ProtectedOnly>
            <FindFriends />
          </ProtectedOnly>
        }
      />
      {/* Invite links work signed in or out, so this route has no guard. */}
      <Route path="/friends/add/:tag" element={<InviteLanding />} />
      <Route
        path="/friends/:tag"
        element={
          <ProtectedOnly>
            <FriendProfile />
          </ProtectedOnly>
        }
      />
      <Route path="/" element={<TrackerWithUserKey />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <ScrollToTopButton />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
