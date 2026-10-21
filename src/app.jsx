import { Routes, Route } from "react-router-dom";

import Navbar from "./modules/navbar";
import Footer from "./modules/footer";

import Home from "./pages/home";
import AboutUs from "./pages/about-us";
import TLevel from "./pages/t-level"
import Profile from "./pages/profile";
import Alummi from "./pages/alummi";
import CoffeeChats from "./pages/coffee-chats";
import Settings from "./pages/settings";
import Quiz from "./pages/quiz";
import TLevelAdvice from "./pages/t-level-advice";
import Information from "./pages/information";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Interest from "./pages/interest";
import Admin from "./pages/admin";

function App() {
  return (
    <div className="App">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/tlevel" element={<TLevel />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/alummi" element={<Alummi />} />
        <Route path="/alummi/coffee-chats" element={<CoffeeChats />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/t-level/advice" element={<TLevelAdvice />} />
        <Route path="/information" element={<Information />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register-interest" element={<Interest />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
