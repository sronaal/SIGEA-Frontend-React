import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "@/App";
import { AppProviders } from "@/app/providers";
import "@/index.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("The #root element is missing in index.html");
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
