"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp, signInWithGoogle } from "@/actions/auth";
import { registerSchema } from "@/lib/validations";

type FormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("full_name", values.full_name);
      fd.set("email", values.email);
      fd.set("password", values.password);
      const res = await signUp(fd);
      if (res && !res.ok) setServerError(res.error);
    });
  });

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Alex Morgan"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          error={errors.password?.message}
          hint="Use 8+ characters with a mix of letters and numbers."
          {...register("password")}
        />
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <Button type="submit" block loading={isSubmitting || pending}>Create account</Button>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
        <div className="relative flex justify-center text-xs"><span className="px-2 bg-surface text-muted">or</span></div>
      </div>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="secondary" block>Sign up with Google</Button>
      </form>
    </div>
  );
}
