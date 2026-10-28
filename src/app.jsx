import { Navigate, Route } from "react-router-dom";

import Navbar from "./modules/navbar";
import Footer from "./modules/footer";
import { PageTransition } from "./modules/motion";

import Home from "./pages/home";
import AboutUs from "./pages/about-us";
import TLevel from "./pages/t-level"
import Profile from "./pages/profile";
import Alummi from "./pages/alummi";
import CoffeeChats from "./pages/coffee-chats";
import Settings from "./pages/settings";
import Quiz from "./pages/quiz";
import TLevelAdvice from "./pages/t-level-advice";
import WhatIsTLevel from "./pages/what-is-a-t-level";
import Information from "./pages/information";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Interest from "./pages/interest";
import Admin from "./pages/admin";
import Opportunities from "./pages/opportunities";
import OpportunityDetail from "./pages/opportunity-detail";
import Guide from "./pages/guide";
import Help from "./pages/help";
import Accessibility from "./pages/accessibility";
import Privacy from "./pages/privacy";
import Interview from "./pages/interview";
import NotFound from "./pages/not-found";

function App() {
  return (
    <div className="App">
      <Navbar />

      <PageTransition>
        <Route path="/" element={<Home />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/tlevel" element={<TLevel />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/alumni" element={<Alummi />} />
        <Route path="/alumni/coffee-chats" element={<CoffeeChats />} />
        {/* Old misspelt addresses still work */}
        <Route path="/alummi" element={<Navigate to="/alumni" replace />} />
        <Route path="/alummi/coffee-chats" element={<Navigate to="/alumni/coffee-chats" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/t-level/advice" element={<TLevelAdvice />} />
        <Route path="/what-is-a-t-level" element={<WhatIsTLevel />} />
        <Route path="/information" element={<Information />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register-interest" element={<Interest />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/opportunities/:id" element={<OpportunityDetail />} />
        <Route path="/guides/:slug" element={<Guide />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/help" element={<Help />} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </PageTransition>

      <Footer />
    </div>
  );
}

export default App;
