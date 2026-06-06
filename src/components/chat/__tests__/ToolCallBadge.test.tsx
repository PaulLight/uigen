import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel unit tests ---

test("getToolCallLabel: str_replace_editor create", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/components/Button.tsx" })).toBe("Editing Button.tsx");
});

test("getToolCallLabel: str_replace_editor insert", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/utils/helpers.ts" })).toBe("Editing helpers.ts");
});

test("getToolCallLabel: str_replace_editor view", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Viewing App.jsx");
});

test("getToolCallLabel: str_replace_editor undo_edit", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("getToolCallLabel: file_manager rename", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/Old.jsx", new_path: "/New.jsx" })).toBe("Renaming Old.jsx to New.jsx");
});

test("getToolCallLabel: file_manager rename without new_path", () => {
  expect(getToolCallLabel("file_manager", { command: "rename", path: "/Old.jsx" })).toBe("Renaming Old.jsx");
});

test("getToolCallLabel: file_manager delete", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "/Unused.jsx" })).toBe("Deleting Unused.jsx");
});

test("getToolCallLabel: unknown tool falls back to toolName", () => {
  expect(getToolCallLabel("some_other_tool", { command: "foo", path: "/x" })).toBe("some_other_tool");
});

test("getToolCallLabel: nested path extracts filename only", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/src/components/Card.tsx" })).toBe("Creating Card.tsx");
});

// --- ToolCallBadge rendering tests ---

function makeInvocation(overrides: Partial<ToolInvocation> = {}): ToolInvocation {
  return {
    toolCallId: "test-id",
    toolName: "str_replace_editor",
    args: { command: "create", path: "/App.jsx" },
    state: "call",
    ...overrides,
  } as ToolInvocation;
}

test("ToolCallBadge shows spinner when state is call", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation({ state: "call" })} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  // spinner is present (no green dot)
  expect(document.querySelector(".animate-spin")).toBeTruthy();
  expect(document.querySelector(".bg-emerald-500")).toBeNull();
});

test("ToolCallBadge shows green dot when state is result", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation({ state: "result", result: "ok" })} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(document.querySelector(".bg-emerald-500")).toBeTruthy();
  expect(document.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge displays correct label for str_replace", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ args: { command: "str_replace", path: "/Button.tsx" }, state: "result", result: "ok" })}
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("ToolCallBadge displays correct label for file_manager delete", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation({ toolName: "file_manager", args: { command: "delete", path: "/Old.jsx" }, state: "call" })}
    />
  );
  expect(screen.getByText("Deleting Old.jsx")).toBeDefined();
});
