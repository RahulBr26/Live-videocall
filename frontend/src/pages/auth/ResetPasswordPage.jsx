import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthLayout from "../../components/auth/AuthLayout";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { authService } from "../../services/authService";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const password = watch("password");

  const onSubmit = async ({ password: newPassword }) => {
    try {
      await authService.resetPassword(token, newPassword);
      toast.success("Password reset! Please log in.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset link may have expired.");
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Invalid link" subtitle="This reset link is missing a token.">
        <p className="text-sm text-[var(--color-text-dim)]">
          Request a{" "}
          <a href="/forgot-password" className="text-[var(--color-accent)] hover:underline">new reset link</a>.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" subtitle="Make it at least 8 characters with one number.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New password" type="password" placeholder="••••••••"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required",
            minLength: { value: 8, message: "At least 8 characters" },
            pattern: { value: /\d/, message: "Include at least one number" },
          })}
        />
        <Input
          label="Confirm password" type="password" placeholder="Repeat password"
          error={errors.confirm?.message}
          {...register("confirm", {
            required: "Please confirm your password",
            validate: (v) => v === password || "Passwords don't match",
          })}
        />
        <Button type="submit" isLoading={isSubmitting} className="w-full">Set new password</Button>
      </form>
    </AuthLayout>
  );
}
