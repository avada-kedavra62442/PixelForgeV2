import React from "react";
import ReactDOM from "react-dom/client";
import PixelForge from "./PixelForge_FIXED";
import { Analytics } from "@vercel/analytics/react";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PixelForge />
    <App />
    <Analytics />
  </React.StrictMode>
);
