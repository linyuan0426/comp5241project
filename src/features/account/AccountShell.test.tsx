import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import AccountShell, { type AccountControls } from "./AccountShell";

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));

vi.mock("../../App", () => ({
  default: ({ account }: { account: AccountControls }) => (
    <button onClick={account.open} type="button">Open account</button>
  ),
}));

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      signUp,
      onAuthStateChange: (callback: (event: string, session: null) => void) => {
        callback("INITIAL_SESSION", null);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

beforeEach(() => {
  signUp.mockReset();
});

async function submitRegistration() {
  const user = userEvent.setup();
  render(<AccountShell />);
  await user.click(await screen.findByRole("button", { name: "Open account" }));
  const dialog = within(screen.getByRole("dialog"));
  await user.click(dialog.getByRole("button", { name: "Create an account" }));
  await user.type(dialog.getByLabelText("Email"), "learner@example.com");
  await user.type(dialog.getByLabelText("Password"), "example-password");
  await user.click(dialog.getByRole("button", { name: "Create account" }));
  return dialog;
}

it("registers with the app redirect and returns to sign-in when email confirmation is required", async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  const dialog = await submitRegistration();

  expect(signUp).toHaveBeenCalledWith({
    email: "learner@example.com",
    password: "example-password",
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  expect(await dialog.findByRole("status")).toHaveTextContent("confirmation link");
  expect(dialog.getByRole("heading")).toHaveTextContent("Sign in to Pathwise");
  expect(dialog.getByLabelText("Password")).toHaveValue("");
});

it("explains when Supabase has disabled registration and leaves sign-in available", async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: { code: "signup_disabled" } });
  const dialog = await submitRegistration();

  expect(await dialog.findByRole("status")).toHaveTextContent("Registration is disabled");
  await userEvent.click(dialog.getByRole("button", { name: "Back to sign in" }));
  expect(dialog.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
});
