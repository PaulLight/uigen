// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

import { createSession, verifySession } from "@/lib/auth";

const COOKIE_NAME = "auth-token";

beforeEach(() => {
  vi.clearAllMocks();
});

test("createSession sets httpOnly cookie with correct name and options", async () => {
  await createSession("u1", "test@example.com");
  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  const [name, , options] = mockCookieStore.set.mock.calls[0];
  expect(name).toBe(COOKIE_NAME);
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession stores a verifiable JWT with correct payload", async () => {
  let capturedToken = "";
  mockCookieStore.set.mockImplementation((_name: string, token: string) => {
    capturedToken = token;
  });

  await createSession("u1", "test@example.com");

  const req = new NextRequest("http://localhost/", {
    headers: { cookie: `${COOKIE_NAME}=${capturedToken}` },
  });
  const session = await verifySession(req);
  expect(session?.userId).toBe("u1");
  expect(session?.email).toBe("test@example.com");
});

test("createSession sets cookie expiry ~7 days in the future", async () => {
  await createSession("u1", "test@example.com");
  const [, , options] = mockCookieStore.set.mock.calls[0];
  const diff = options.expires.getTime() - Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  expect(diff).toBeGreaterThan(sevenDaysMs - 5000);
  expect(diff).toBeLessThanOrEqual(sevenDaysMs);
});
