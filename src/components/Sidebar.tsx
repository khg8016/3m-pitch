import React, { useState } from 'react';
import { Home, Upload, Mail, User, LogOut, Timer, Briefcase } from 'lucide-react';
import { Link } from './Link';
import { Link as RouterLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { UploadStudio } from './UploadStudio';
import { AuthModal } from './AuthModal';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function Sidebar() {
  const [isUploadStudioOpen, setIsUploadStudioOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    { icon: Home, text: 'Home', path: '/' },
    { icon: Mail, text: 'Inbox', path: '/inbox' },
    { icon: User, text: 'Profile', path: '/profile' },
  ];

  const Logo = () => (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <Timer className="w-8 h-8 text-blue-500" />
        <Briefcase className="w-4 h-4 text-blue-700 absolute -bottom-1 -right-1" />
      </div>
      <div className="flex flex-col">
        <span className="font-bold text-lg text-gray-900 dark:text-white leading-tight">3 Min</span>
        <span className="text-xs text-gray-600 dark:text-gray-400 leading-tight">Pitch</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed h-screen w-64 border-r border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 transition-colors">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between p-2">
            <Logo />
            <ThemeToggle />
          </div>
          
          {menuItems.map((item) => (
            <Link key={item.text} Icon={item.icon} text={item.text} path={item.path} />
          ))}
          
          {user ? (
            <>
              <button
                onClick={() => setIsUploadStudioOpen(true)}
                className="w-full rounded-full bg-blue-500 py-3 text-white font-bold hover:bg-blue-600 transition flex items-center justify-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Upload</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full rounded-full border-2 border-red-500 py-3 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-950 transition flex items-center justify-center space-x-2 md:block hidden"
              >
                <LogOut className="w-5 h-5 inline-block" />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full rounded-full bg-blue-500 py-3 text-white font-bold hover:bg-blue-600 transition flex items-center justify-center space-x-2"
            >
              <User className="w-5 h-5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <div className="flex justify-around items-center h-16 px-4">
          <RouterLink to="/" className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500">
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </RouterLink>
          
          <button
            onClick={() => setIsUploadStudioOpen(true)}
            className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500"
          >
            <Upload className="w-6 h-6" />
            <span className="text-xs mt-1">Upload</span>
          </button>

          <RouterLink to="/inbox" className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500">
            <Mail className="w-6 h-6" />
            <span className="text-xs mt-1">Inbox</span>
          </RouterLink>

          <RouterLink to="/profile" className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500">
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </RouterLink>
        </div>
      </div>

      <UploadStudio
        isOpen={isUploadStudioOpen}
        onClose={() => setIsUploadStudioOpen(false)}
      />
      
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}
