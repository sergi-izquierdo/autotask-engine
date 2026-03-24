"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TaskActionsProps {
  taskId: string;
  onTriggerRun: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export function TaskActions({ taskId, onTriggerRun, onDelete }: TaskActionsProps) {
  const router = useRouter();
  const [runLoading, setRunLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleRunNow() {
    setRunLoading(true);
    try {
      await onTriggerRun();
    } finally {
      setRunLoading(false);
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await onDelete();
      router.push("/tasks");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleRunNow} disabled={runLoading} size="sm">
        {runLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Run Now
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/tasks/${taskId}/edit`)}
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Confirm Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      )}
    </div>
  );
}
