import { Routes, Route } from "react-router-dom";

import Navbar from "./modules/navbar";

import Home from "./pages/home";
import Profile from "./pages/profile";
import Alummi from "./pages/alummi";
import CoffeeChats from "./pages/coffee-chats";
import Settings from "./pages/settings"

function App() {
  return (
    <div className="App">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/alummi" element={<Alummi />} />
        <Route path="/alummi/coffee-chats" element={<CoffeeChats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  );
}

export default App;
