import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RaceProvider } from "./state/RaceContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RaceProvider>
      <App />
    </RaceProvider>
  </StrictMode>,
);
