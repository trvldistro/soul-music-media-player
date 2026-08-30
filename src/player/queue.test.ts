import { describe, expect, it } from "vitest";
import { buildOrder, nextPos, prevPos } from "./queue";

describe("buildOrder", () => {
  // @kliv-spec-derived — from intent: "shuffle plays every track exactly once, starting from the one clicked"
  it("shuffled order contains every index exactly once and starts with the clicked track", () => {
    const order = buildOrder(12, 5, true);
    expect(new Set(order).size).toBe(12);
    expect(order[0]).toBe(5);
  });

  it("unshuffled order is the identity", () => {
    expect(buildOrder(4, 2, false)).toEqual([0, 1, 2, 3]);
  });

  it("handles empty queues and clamps the start index", () => {
    expect(buildOrder(0, 0, true)).toEqual([]);
    expect(buildOrder(3, 99, false)[0]).toBe(0);
  });
});

describe("nextPos", () => {
  // @kliv-spec-derived — from intent: "repeat-all wraps around; repeat-off stops at the end"
  it("advances inside the order", () => {
    expect(nextPos(5, 2, "off")).toBe(3);
  });

  it("wraps to the start under repeat-all and stops under repeat-off", () => {
    expect(nextPos(5, 4, "all")).toBe(0);
    expect(nextPos(5, 4, "off")).toBeNull();
  });

  it("is null for an empty order", () => {
    expect(nextPos(0, 0, "all")).toBeNull();
  });
});

describe("prevPos", () => {
  it("steps back and clamps at the start unless repeat-all wraps", () => {
    expect(prevPos(5, 3, "off")).toBe(2);
    expect(prevPos(5, 0, "off")).toBe(0);
    expect(prevPos(5, 0, "all")).toBe(4);
  });
});
