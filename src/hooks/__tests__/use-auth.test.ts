import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "../use-auth";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock server actions
const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (email: string, password: string) =>
    mockSignInAction(email, password),
  signUp: (email: string, password: string) =>
    mockSignUpAction(email, password),
}));

// Mock anon work tracker
const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

// Mock project actions
const mockGetProjects = vi.fn();
const mockCreateProject = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: (data: any) => mockCreateProject(data),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPush.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Happy Path Tests
// ============================================================================

test("signIn initializes with isLoading false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("signIn with valid credentials succeeds and navigates to first project when no anon work", async () => {
  const mockProject = { id: "project-123", name: "Test Project" };
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([mockProject]);

  const { result } = renderHook(() => useAuth());

  let signInResult;
  await act(async () => {
    signInResult = await result.current.signIn("user@example.com", "password123");
  });

  expect(signInResult).toEqual({ success: true });
  expect(mockSignInAction).toHaveBeenCalledWith(
    "user@example.com",
    "password123"
  );
  expect(mockGetAnonWorkData).toHaveBeenCalled();
  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/project-123");
  expect(mockClearAnonWork).not.toHaveBeenCalled();
});

test("signUp with valid credentials succeeds and navigates to first project when no anon work", async () => {
  const mockProject = { id: "project-456", name: "New Project" };
  mockSignUpAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([mockProject]);

  const { result } = renderHook(() => useAuth());

  let signUpResult;
  await act(async () => {
    signUpResult = await result.current.signUp("user@example.com", "password123");
  });

  expect(signUpResult).toEqual({ success: true });
  expect(mockSignUpAction).toHaveBeenCalledWith(
    "user@example.com",
    "password123"
  );
  expect(mockGetAnonWorkData).toHaveBeenCalled();
  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/project-456");
});

test("signIn with anon work creates project from anonymous data and clears it", async () => {
  const anonData = {
    messages: [{ id: "1", content: "test" }],
    fileSystemData: { files: ["App.jsx"] },
  };
  const createdProject = { id: "anon-project-789" };

  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(anonData);
  mockCreateProject.mockResolvedValue(createdProject);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockCreateProject).toHaveBeenCalledWith({
    name: expect.stringMatching(/^Design from/),
    messages: anonData.messages,
    data: anonData.fileSystemData,
  });
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockGetProjects).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/anon-project-789");
});

test("signIn with no anon work and no projects creates a new project", async () => {
  const newProject = { id: "new-project-999" };

  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue(newProject);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockCreateProject).toHaveBeenCalledWith({
    name: expect.stringMatching(/^New Design #/),
    messages: [],
    data: {},
  });
  expect(mockPush).toHaveBeenCalledWith("/new-project-999");
});

test("signIn navigates to most recent project when multiple exist", async () => {
  const projects = [
    { id: "project-1", name: "Recent" },
    { id: "project-2", name: "Older" },
  ];

  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue(projects);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockPush).toHaveBeenCalledWith("/project-1");
});

// ============================================================================
// Error State Tests
// ============================================================================

test("signIn returns error when signInAction fails", async () => {
  mockSignInAction.mockResolvedValue({
    success: false,
    error: "Invalid credentials",
  });

  const { result } = renderHook(() => useAuth());

  let signInResult;
  await act(async () => {
    signInResult = await result.current.signIn(
      "user@example.com",
      "wrongpassword"
    );
  });

  expect(signInResult).toEqual({ success: false, error: "Invalid credentials" });
  expect(mockGetAnonWorkData).not.toHaveBeenCalled();
  expect(mockGetProjects).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp returns error when signUpAction fails", async () => {
  mockSignUpAction.mockResolvedValue({
    success: false,
    error: "Email already exists",
  });

  const { result } = renderHook(() => useAuth());

  let signUpResult;
  await act(async () => {
    signUpResult = await result.current.signUp(
      "existing@example.com",
      "password123"
    );
  });

  expect(signUpResult).toEqual({ success: false, error: "Email already exists" });
  expect(mockGetAnonWorkData).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

test("signIn handles thrown error from signInAction", async () => {
  const error = new Error("Network error");
  mockSignInAction.mockRejectedValue(error);

  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () => {
      await result.current.signIn("user@example.com", "password123");
    })
  ).rejects.toThrow("Network error");

  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp handles thrown error from signUpAction", async () => {
  const error = new Error("Server error");
  mockSignUpAction.mockRejectedValue(error);

  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () => {
      await result.current.signUp("user@example.com", "password123");
    })
  ).rejects.toThrow("Server error");

  expect(mockPush).not.toHaveBeenCalled();
});

// ============================================================================
// Edge Cases
// ============================================================================

test("anonymous work with empty messages array is skipped", async () => {
  const anonDataWithEmptyMessages = {
    messages: [],
    fileSystemData: { files: [] },
  };
  const mockProject = { id: "project-123" };

  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(anonDataWithEmptyMessages);
  mockGetProjects.mockResolvedValue([mockProject]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/project-123");
  expect(mockClearAnonWork).not.toHaveBeenCalled();
});

test("loading state is true during signIn execution", async () => {
  let loadingStates: boolean[] = [];

  mockSignInAction.mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 50);
      })
  );
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "project-123" }]);

  const { result } = renderHook(() => useAuth());

  const signInPromise = act(async () => {
    const promise = result.current.signIn("user@example.com", "password123");
    loadingStates.push(result.current.isLoading);
    return promise;
  });

  await signInPromise;
  loadingStates.push(result.current.isLoading);

  expect(loadingStates[0]).toBe(true);
  expect(loadingStates[1]).toBe(false);
});

test("loading state is true during signUp execution", async () => {
  let loadingStates: boolean[] = [];

  mockSignUpAction.mockImplementation(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 50);
      })
  );
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "project-123" }]);

  const { result } = renderHook(() => useAuth());

  const signUpPromise = act(async () => {
    const promise = result.current.signUp("user@example.com", "password123");
    loadingStates.push(result.current.isLoading);
    return promise;
  });

  await signUpPromise;
  loadingStates.push(result.current.isLoading);

  expect(loadingStates[0]).toBe(true);
  expect(loadingStates[1]).toBe(false);
});

test("loading state is reset to false even when signInAction fails", async () => {
  mockSignInAction.mockResolvedValue({
    success: false,
    error: "Invalid credentials",
  });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "wrongpassword");
  });

  expect(result.current.isLoading).toBe(false);
});

test("loading state is reset to false even when handlePostSignIn throws", async () => {
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockRejectedValue(new Error("Failed to fetch projects"));

  const { result } = renderHook(() => useAuth());

  await expect(
    act(async () => {
      await result.current.signIn("user@example.com", "password123");
    })
  ).rejects.toThrow();

  expect(result.current.isLoading).toBe(false);
});

test("anon work is cleared after creating project from it", async () => {
  const anonData = {
    messages: [{ id: "1", content: "test" }],
    fileSystemData: {},
  };

  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(anonData);
  mockCreateProject.mockResolvedValue({ id: "new-project" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockClearAnonWork).toHaveBeenCalled();
});

test("anon work is not cleared if it has no messages", async () => {
  const anonData = {
    messages: [],
    fileSystemData: {},
  };

  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(anonData);
  mockGetProjects.mockResolvedValue([{ id: "project-123" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockClearAnonWork).not.toHaveBeenCalled();
});

test("handlePostSignIn is called after successful signIn", async () => {
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "project-123" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalled();
});

test("handlePostSignIn is called after successful signUp", async () => {
  mockSignUpAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([{ id: "project-456" }]);

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signUp("newuser@example.com", "password123");
  });

  expect(mockGetProjects).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalled();
});

// ============================================================================
// Return Value Tests
// ============================================================================

test("returns all required methods and state", () => {
  const { result } = renderHook(() => useAuth());

  expect(typeof result.current.signIn).toBe("function");
  expect(typeof result.current.signUp).toBe("function");
  expect(typeof result.current.isLoading).toBe("boolean");
});

test("signIn and signUp are different functions", () => {
  const { result } = renderHook(() => useAuth());

  expect(result.current.signIn).not.toBe(result.current.signUp);
});

// ============================================================================
// Integration-like Tests
// ============================================================================

test("handles project name generation with current time", async () => {
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue({
    messages: [{ id: "1" }],
    fileSystemData: {},
  });
  mockCreateProject.mockResolvedValue({ id: "new-project" });

  const { result } = renderHook(() => useAuth());

  const beforeTime = new Date().toLocaleTimeString();

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  const afterTime = new Date().toLocaleTimeString();
  const callArgs = mockCreateProject.mock.calls[0][0];

  expect(callArgs.name).toMatch(/^Design from/);
});

test("handles random project name generation for new projects", async () => {
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project" });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.signIn("user@example.com", "password123");
  });

  const callArgs = mockCreateProject.mock.calls[0][0];
  expect(callArgs.name).toMatch(/^New Design #\d+$/);
  expect(parseInt(callArgs.name.split("#")[1])).toBeLessThan(100000);
});
