import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { DataProvider } from "./lib/store.jsx";
import { SettingsProvider } from "./lib/i18n.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
