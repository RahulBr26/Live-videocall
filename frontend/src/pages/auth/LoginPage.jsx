import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { connectSocket } from "../../services/socket";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (formData) => {
    setServerError("");
    try {
      const { accessToken, user } = await authService.login(formData);
      setAuth(user, accessToken);
      connectSocket(accessToken);
      toast.success(`Welcome back, ${user.username}`);
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.message || "Login failed. Please try again.");
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to keep the conversation going.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email" type="email" placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", { required: "Email is required" })}
        />
        <Input
          label="Password" type="password" placeholder="••••••••"
          error={errors.password?.message}
          {...register("password", { required: "Password is required" })}
        />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm text-[var(--color-accent)] hover:underline">
            Forgot password?
          </Link>
        </div>
        {serverError && <p className="text-sm text-red-400">{serverError}</p>}
        <Button type="submit" isLoading={isSubmitting} className="w-full">Log in</Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="flex-1 border-t border-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-text-dim)]">or</span>
        <div className="flex-1 border-t border-[var(--color-border)]" />
      </div>

      <GoogleAuthButton />

      <p className="mt-6 text-center text-sm text-[var(--color-text-dim)]">
        Don't have an account?{" "}
        <Link to="/register" className="text-[var(--color-accent)] hover:underline">Sign up</Link>
      </p>
    </AuthLayout>
  );
}
