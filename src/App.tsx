import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Feed } from "./components/Feed";
import { ProfilePage } from "./components/ProfilePage";
import { UploadPage } from "./components/UploadPage";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <div className="min-h-screen bg-white dark:bg-black">
            <Sidebar />
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/video/:videoId" element={<Feed />} />
              <Route path="/profile/:userId" element={<ProfilePage />} />
              <Route path="/upload" element={<UploadPage />} />
            </Routes>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
