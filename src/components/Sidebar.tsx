import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  User,
  Upload,
  LogIn,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { AuthModal } from "./AuthModal";
import { Logo } from "./Logo";
import { supabase } from "../lib/supabase";

export function Sidebar(): JSX.Element {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleUploadClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    navigate("/upload");
  };

  const handleAuthClose = () => {
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Force reload to clear all interaction states
    window.location.reload();
  };

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div className="fixed left-0 top-0 bottom-0 w-16 lg:w-64 bg-white dark:bg-black border-r border-gray-200 dark:border-gray-800 z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center px-4 h-16 border-b border-gray-200 dark:border-gray-800"
          >
            <Logo />
          </Link>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4">
            <Link
              to="/"
              className={`flex items-center gap-4 px-2 py-3 rounded-lg ${
                isActive("/")
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="hidden lg:block">Home</span>
            </Link>

            {user && (
              <Link
                to={`/profile/${user.id}`}
                className={`flex items-center gap-4 px-2 py-3 rounded-lg ${
                  isActive("/profile")
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                }`}
              >
                <User className="w-6 h-6" />
                <span className="hidden lg:block">Profile</span>
              </Link>
            )}

            <button
              onClick={handleUploadClick}
              className={`flex items-center gap-4 px-2 py-3 rounded-lg w-full ${
                isActive("/upload")
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
              }`}
            >
              <Upload className="w-6 h-6" />
              <span className="hidden lg:block">Upload</span>
            </button>
          </nav>

          {/* Footer */}
          <div className="px-2 py-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-4 px-2 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg w-full"
            >
              {isDark ? (
                <Sun className="w-6 h-6" />
              ) : (
                <Moon className="w-6 h-6" />
              )}
              <span className="hidden lg:block">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            </button>

            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-4 px-2 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg w-full"
              >
                <LogOut className="w-6 h-6" />
                <span className="hidden lg:block">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-4 px-2 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg w-full"
              >
                <LogIn className="w-6 h-6" />
                <span className="hidden lg:block">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={handleAuthClose} />
      )}
    </>
  );
}
