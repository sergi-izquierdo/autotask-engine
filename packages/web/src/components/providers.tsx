"use client";

import { ToastProvider } from "@/components/toast";
import { WsProvider } from "@/components/ws-provider";
import { WsToastListener } from "@/components/ws-toast-listener";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <WsProvider>
        <WsToastListener />
        {children}
      </WsProvider>
    </ToastProvider>
  );
}
