import "./styles/global.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./app.jsx";
import { AuthProvider } from "./modules/auth";
import { loadSettings, applySettings } from "./modules/accessibility";

// Apply saved accessibility preferences before the app renders.
applySettings(loadSettings());

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
