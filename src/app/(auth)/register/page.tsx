import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Sign up · CaloryTracker" };

export default function RegisterPage() {
  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <p className="text-sm text-muted mt-1.5">It takes 30 seconds. We&apos;ll set sensible defaults.</p>
      <RegisterForm />
      <p className="text-sm text-muted mt-6 text-center">
        Already have one?{" "}
        <Link href="/login" className="text-primary hover:underline">Log in</Link>
      </p>
    </div>
  );
}
