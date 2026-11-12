import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AccountShell from "./features/account/AccountShell";
import { LanguageProvider } from "./lib/i18n";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <AccountShell />
    </LanguageProvider>
  </StrictMode>,
);
