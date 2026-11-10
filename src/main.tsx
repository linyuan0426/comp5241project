import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AccountShell from "./features/account/AccountShell";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccountShell />
  </StrictMode>,
);
