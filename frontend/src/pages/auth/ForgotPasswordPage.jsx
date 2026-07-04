import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { authService } from "../../services/authService";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error("Something went wrong. Try again.");
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your inbox" subtitle="We sent a reset link if that email is registered.">
        <p className="text-sm text-[var(--color-text-dim)]">
          Didn't receive it?{" "}
          <button onClick={() => setSent(false)} className="text-[var(--color-accent)] hover:underline">
            Try again
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" subtitle="Enter your email and we'll send a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", { required: "Email is required" })}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--color-text-dim)]">
        <Link to="/login" className="text-[var(--color-accent)] hover:underline">Back to log in</Link>
      </p>
    </AuthLayout>
  );
}
