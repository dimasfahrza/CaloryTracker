import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in · CaloryTracker" };

export default function LoginPage({
  searchParams,
}: { searchParams: { confirm?: string; error?: string; next?: string } }) {
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <p className="text-sm text-muted mt-1.5">Log in to keep your streak going.</p>

      {searchParams.confirm && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
          Check your inbox to verify your email — then come back here to log in.
        </div>
      )}
      {searchParams.error && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm">
          {searchParams.error === "oauth" ? "Sign-in cancelled or failed." : "Something went wrong."}
        </div>
      )}

      <LoginForm />

      <p className="text-sm text-muted mt-6 text-center">
        New here?{" "}
        <Link href="/register" className="text-primary hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
