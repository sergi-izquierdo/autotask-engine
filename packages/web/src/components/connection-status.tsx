"use client";

import { useWsContext } from "@/components/ws-provider";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

const statusDisplay = {
  connected: {
    icon: Wifi,
    label: "Connected",
    className: "text-green-600 dark:text-green-400",
    dotClass: "bg-green-500",
  },
  connecting: {
    icon: Loader2,
    label: "Connecting",
    className: "text-yellow-600 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
  },
  reconnecting: {
    icon: Loader2,
    label: "Reconnecting",
    className: "text-yellow-600 dark:text-yellow-400",
    dotClass: "bg-yellow-500",
  },
  disconnected: {
    icon: WifiOff,
    label: "Disconnected",
    className: "text-red-600 dark:text-red-400",
    dotClass: "bg-red-500",
  },
} as const;

export function ConnectionStatus() {
  const { status, reconnect } = useWsContext();
  const display = statusDisplay[status];
  const Icon = display.icon;
  const isSpinning = status === "connecting" || status === "reconnecting";

  return (
    <button
      onClick={status === "disconnected" ? reconnect : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
        "hover:bg-accent",
        display.className,
      )}
      title={status === "disconnected" ? "Click to reconnect" : `WebSocket: ${display.label}`}
    >
      <Icon className={cn("h-3.5 w-3.5", isSpinning && "animate-spin")} />
      <span className="hidden sm:inline">{display.label}</span>
    </button>
  );
}
