import { TaskForm } from "@/components/task-form";

export const metadata = {
  title: "Create Task | AutoTask Engine",
};

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">New Task</h1>
        <p className="text-muted-foreground">Create a new automated task.</p>
      </div>
      <TaskForm />
    </div>
  );
}
