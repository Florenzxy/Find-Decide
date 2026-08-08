import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "fake-indexeddb/auto";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
