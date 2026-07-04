import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Camera } from "lucide-react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { messageService } from "../services/messageService";
import api from "../services/api";
import Input from "../components/common/Input";
import Button from "../components/common/Button";
import Avatar from "../components/common/Avatar";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const fileRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { username: user?.username, bio: user?.bio, statusMessage: user?.statusMessage },
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => messageService.uploadAvatar(file),
    onSuccess: ({ avatar }) => {
      setUser({ ...user, avatar });
      toast.success("Avatar updated");
      setAvatarPreview(null);
    },
    onError: () => toast.error("Failed to update avatar"),
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    avatarMutation.mutate(file);
  };

  const onSubmit = async (data) => {
    try {
      const res = await api.patch("/users/me", data);
      setUser({ ...user, ...res.data.user });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="mx-auto max-w-lg px-6 py-8">
      <h2 className="font-display text-xl font-semibold mb-6">Settings</h2>

      {/* Avatar section */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar
            src={avatarPreview || user?.avatar?.url}
            name={user?.username}
            size="lg"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow transition hover:brightness-110"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        {avatarMutation.isPending && (
          <span className="text-xs text-[var(--color-text-dim)]">Uploading…</span>
        )}
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Username"
          error={errors.username?.message}
          {...register("username", {
            required: "Username is required",
            minLength: { value: 3, message: "At least 3 characters" },
          })}
        />
        <Input label="Bio" placeholder="Tell people about yourself…" {...register("bio")} />
        <Input label="Status" placeholder="What are you up to?" {...register("statusMessage")} />
        <Button type="submit" isLoading={isSubmitting} className="w-full">Save changes</Button>
      </form>
    </div>
  );
}
