import { Outlet } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import CallOverlay from "../components/calls/CallOverlay";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
      {/* Floating call overlay renders on top of everything when a call is active */}
      <CallOverlay />
    </div>
  );
}
