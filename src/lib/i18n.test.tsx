import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { LanguageProvider, LanguageSwitch } from "./i18n";

function LanguageProbe() {
  return (
    <section>
      <LanguageSwitch />
      <button aria-label="Sign in" type="button">Sign in</button>
      <input aria-label="Email" placeholder="Email" />
      <span>· very confident</span>
      <span>0/2000 · No credit for saying “AI is dumb.”</span>
    </section>
  );
}

describe("global language switch", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "en";
  });

  it("switches text and accessible labels, persists the locale, and restores English", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    await user.click(screen.getByRole("button", { name: "中文" }));
    await waitFor(() => expect(screen.getByText("登录")).toBeInTheDocument());
    expect(screen.getByLabelText("邮箱")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("邮箱")).toBeInTheDocument();
    expect(screen.getByText("· 非常自信")).toBeInTheDocument();
    expect(screen.getByText("0/2000 · 只说“AI 真笨”不算解释。")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(localStorage.getItem("pathwise-language:v1")).toBe("zh");

    await user.click(screen.getByRole("button", { name: "EN" }));
    await waitFor(() => expect(screen.getByText("Sign in")).toBeInTheDocument());
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("translates the app navigation and lazy-loaded practice route", async () => {
    window.history.replaceState(null, "", "#fun");
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <App />
      </LanguageProvider>,
    );

    await user.click(screen.getByRole("button", { name: "中文" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "趣味练习" })).toBeInTheDocument();
    });
    expect(
      await screen.findByRole("heading", { name: /学习群聊.*救场/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传课件" })).toBeInTheDocument();
  });
});
