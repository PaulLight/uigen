import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

function getFileName(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}

export function getToolCallLabel(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "str_replace_editor") {
    const command = args.command as string;
    const file = getFileName(args.path as string);
    switch (command) {
      case "create":    return `Creating ${file}`;
      case "str_replace":
      case "insert":    return `Editing ${file}`;
      case "view":      return `Viewing ${file}`;
      case "undo_edit": return `Undoing edit in ${file}`;
      default:          return `Editing ${file}`;
    }
  }

  if (toolName === "file_manager") {
    const command = args.command as string;
    const file = getFileName(args.path as string);
    const newFile = args.new_path ? getFileName(args.new_path as string) : undefined;
    switch (command) {
      case "rename": return `Renaming ${file}${newFile ? ` to ${newFile}` : ""}`;
      case "delete": return `Deleting ${file}`;
      default:       return toolName;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const label = getToolCallLabel(toolName, args as Record<string, unknown>);
  const done = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {done ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
