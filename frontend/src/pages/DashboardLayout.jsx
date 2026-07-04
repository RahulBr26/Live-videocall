import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import CallOverlay from "../components/calls/CallOverlay";

export default function DashboardLayout() {
  const location = useLocation();
  const isDetailRoute = location.pathname !== "/dashboard";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--color-bg)]">
      <div className={`${isDetailRoute ? "hidden md:flex" : "flex"} h-full w-full shrink-0 md:w-72`}>
        <Sidebar />
      </div>
      <main className={`relative flex-1 flex-col overflow-hidden ${isDetailRoute ? "flex" : "hidden md:flex"}`}>
        <Outlet />
      </main>
      {/* Floating call overlay renders on top of everything when a call is active */}
      <CallOverlay />
    </div>
  );
}
