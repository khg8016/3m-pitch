import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Feed } from './components/Feed';
import { ProfilePage } from './components/ProfilePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black transition-colors">
        <div className="max-w-7xl mx-auto flex">
          <Sidebar />
          <main className="flex-1 md:ml-64">
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
