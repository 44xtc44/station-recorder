// sanitize.test.js
"use strict";

/**
 * Jest has no integrated support for "module" style code.
 * Resolve the issue -> package.json add
 * (A) "type": "module",
 * (B) "test": "node --experimental-vm-modules node_modules/.bin/jest"
 */
import { summe } from "./sanitize.js";

describe("See if jest test runs on the system at all.", () => {
  test("adds 1 + 2 to equal 3", () => {
    expect(summe(1, 2)).toBe(3);
  });
  test("Second test in this suite adds 2 + 5, equals 7", () => {
    expect(summe(2, 5)).toBe(7);
  });
});
