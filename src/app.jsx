import { Routes, Route } from "react-router-dom";

import Navbar from "./modules/navbar";
import Home from "./pages/home";
import Profile from "./pages/profile";

function App() {
  return (
    <div className="App">
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default App;
