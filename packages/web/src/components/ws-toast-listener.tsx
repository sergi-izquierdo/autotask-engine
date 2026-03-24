"use client";

import { useEffect } from "react";
import { useWsContext } from "@/components/ws-provider";
import { useToast } from "@/components/toast";
import type { WsServerEvent } from "@/lib/ws-types";

export function WsToastListener() {
  const { subscribe } = useWsContext();
  const { addToast } = useToast();

  useEffect(() => {
    const handler = (event: WsServerEvent) => {
      switch (event.type) {
        case "run:completed": {
          const run = event.payload;
          addToast({
            title: "Run completed",
            description: `Task run ${run.id.slice(0, 8)} finished successfully.`,
            variant: "success",
          });
          break;
        }
        case "run:failed": {
          const run = event.payload;
          addToast({
            title: "Run failed",
            description: run.error ?? `Task run ${run.id.slice(0, 8)} failed.`,
            variant: "error",
          });
          break;
        }
      }
    };

    return subscribe(handler);
  }, [subscribe, addToast]);

  return null;
}
