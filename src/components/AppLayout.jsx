import React from "react";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import ContinueListeningBar from "./ContinueListeningBar";

// Shared shell for every authenticated screen: sticky top bar, persistent
// Continue Listening bar, floating iOS-blur bottom navigation.
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto max-w-md px-5 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+150px)]">
        <Outlet />
      </main>
      <ContinueListeningBar />
      <BottomNav />
    </div>
  );
}