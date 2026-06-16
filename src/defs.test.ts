// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from "vitest";
import {
  nextFF,
  isFF,
  isGate,
  asSig,
  asBits,
  GATE_FN,
  CUSTOM,
  defineCustom,
  removeCustom,
  duplicateCustom,
  renameCustom,
  regWidth,
  busWidth,
  regPorts,
  portsOf,
} from "./defs";
import type { Sig, RFNode } from "./types";

describe("asSig", () => {
  it("returns scalar as-is", () => {
    expect(asSig(0)).toBe(0);
    expect(asSig(1)).toBe(1);
    expect(asSig("x")).toBe("x");
    expect(asSig("z")).toBe("z");
  });

  it("unwraps single-element array", () => {
    expect(asSig([1])).toBe(1);
    expect(asSig(["x"])).toBe("x");
  });

  it("returns x for multi-element array", () => {
    expect(asSig([1, 0])).toBe("x");
  });

  it("returns z for undefined", () => {
    expect(asSig(undefined)).toBe("z");
  });
});

describe("asBits", () => {
  it("pads short arrays with z", () => {
    const r = asBits([1], 4);
    expect(r).toEqual([1, "z", "z", "z"]);
  });

  it("truncates long arrays", () => {
    const r = asBits([1, 0, 1, 0, 1], 3);
    expect(r).toEqual([1, 0, 1]);
  });

  it("converts scalar to array", () => {
    const r = asBits(1, 4);
    expect(r).toEqual([1, "z", "z", "z"]);
  });
});

describe("GATE_FN", () => {
  const g = (inputs: Sig[]) => inputs;
  it("AND: only 1+1=1", () => {
    expect(GATE_FN.AND(g([1, 1]))).toEqual([1]);
    expect(GATE_FN.AND(g([1, 0]))).toEqual([0]);
    expect(GATE_FN.AND(g([0, 1]))).toEqual([0]);
    expect(GATE_FN.AND(g([0, 0]))).toEqual([0]);
  });

  it("AND: x propagation", () => {
    expect(GATE_FN.AND(g([1, "x"]))).toEqual(["x"]);
    expect(GATE_FN.AND(g([0, "x"]))).toEqual([0]);
  });

  it("OR: only 0+0=0", () => {
    expect(GATE_FN.OR(g([0, 0]))).toEqual([0]);
    expect(GATE_FN.OR(g([1, 0]))).toEqual([1]);
    expect(GATE_FN.OR(g([0, 1]))).toEqual([1]);
    expect(GATE_FN.OR(g([1, 1]))).toEqual([1]);
  });

  it("NOT: inverts", () => {
    expect(GATE_FN.NOT(g([1]))).toEqual([0]);
    expect(GATE_FN.NOT(g([0]))).toEqual([1]);
    expect(GATE_FN.NOT(g(["x"]))).toEqual(["x"]);
  });

  it("XOR: difference detector", () => {
    expect(GATE_FN.XOR(g([0, 0]))).toEqual([0]);
    expect(GATE_FN.XOR(g([0, 1]))).toEqual([1]);
    expect(GATE_FN.XOR(g([1, 0]))).toEqual([1]);
    expect(GATE_FN.XOR(g([1, 1]))).toEqual([0]);
  });
});

describe("nextFF", () => {
  const getIn = (v: Sig) => (_name: string) => v;

  it("DFF passes D to Q", () => {
    expect(nextFF("DFF", 0, getIn(1))).toBe(1);
    expect(nextFF("DFF", 1, getIn(0))).toBe(0);
  });

  it("TFF toggles on T=1", () => {
    expect(nextFF("TFF", 0, getIn(1))).toBe(1);
    expect(nextFF("TFF", 1, getIn(1))).toBe(0);
  });

  it("TFF holds on T=0", () => {
    expect(nextFF("TFF", 0, getIn(0))).toBe(0);
    expect(nextFF("TFF", 1, getIn(0))).toBe(1);
  });

  it("TFF returns x on T=x", () => {
    expect(nextFF("TFF", 0, getIn("x"))).toBe("x");
  });

  it("JKFF: J=1,K=0 -> set", () => {
    let i = 0;
    const getInJK = (name: string): Sig => (name === "J" ? 1 : name === "K" ? 0 : 0);
    expect(nextFF("JKFF", 0, getInJK)).toBe(1);
  });

  it("JKFF: J=0,K=1 -> reset", () => {
    const getInJK = (name: string): Sig => (name === "J" ? 0 : name === "K" ? 1 : 0);
    expect(nextFF("JKFF", 1, getInJK)).toBe(0);
  });

  it("JKFF: J=1,K=1 -> toggle", () => {
    const getInJK = (name: string): Sig => (name === "J" ? 1 : name === "K" ? 1 : 0);
    expect(nextFF("JKFF", 0, getInJK)).toBe(1);
    expect(nextFF("JKFF", 1, getInJK)).toBe(0);
  });

  it("JKFF: J=0,K=0 -> hold", () => {
    const getInJK = (_name: string): Sig => 0;
    expect(nextFF("JKFF", 0, getInJK)).toBe(0);
    expect(nextFF("JKFF", 1, getInJK)).toBe(1);
  });

  it("SRFF: S=1,R=0 -> set", () => {
    const getInSR = (name: string): Sig => (name === "S" ? 1 : name === "R" ? 0 : 0);
    expect(nextFF("SRFF", 0, getInSR)).toBe(1);
  });

  it("SRFF: S=0,R=1 -> reset", () => {
    const getInSR = (name: string): Sig => (name === "S" ? 0 : name === "R" ? 1 : 0);
    expect(nextFF("SRFF", 1, getInSR)).toBe(0);
  });

  it("SRFF: S=1,R=1 -> x (invalid)", () => {
    const getInSR = (name: string): Sig => (name === "S" ? 1 : name === "R" ? 1 : 0);
    expect(nextFF("SRFF", 0, getInSR)).toBe("x");
  });

  it("SRFF: S=0,R=0 -> hold", () => {
    const getInSR = (_name: string): Sig => 0;
    expect(nextFF("SRFF", 0, getInSR)).toBe(0);
    expect(nextFF("SRFF", 1, getInSR)).toBe(1);
  });
});

describe("isFF / isGate", () => {
  it("identifies FF kinds", () => {
    expect(isFF("DFF")).toBe(true);
    expect(isFF("TFF")).toBe(true);
    expect(isFF("JKFF")).toBe(true);
    expect(isFF("SRFF")).toBe(true);
    expect(isFF("AND")).toBe(false);
    expect(isFF("INPUT")).toBe(false);
  });

  it("identifies gate kinds", () => {
    expect(isGate("AND")).toBe(true);
    expect(isGate("OR")).toBe(true);
    expect(isGate("NOT")).toBe(true);
    expect(isGate("NAND")).toBe(true);
    expect(isGate("NOR")).toBe(true);
    expect(isGate("XOR")).toBe(true);
    expect(isGate("XNOR")).toBe(true);
    expect(isGate("DFF")).toBe(false);
  });
});

describe("defineCustom / CUSTOM", () => {
  beforeEach(() => {
    Object.keys(CUSTOM).forEach(removeCustom);
  });

  it("defines a custom component from expression", () => {
    const kind = defineCustom("MUX2", "S, A, B", "Y = (not S and A) or (S and B)");
    expect(kind).toBe("CUSTOM:MUX2");
    expect(CUSTOM[kind].inputs).toEqual(["S", "A", "B"]);
    expect(CUSTOM[kind].outputs).toEqual(["Y"]);
    const fn = CUSTOM[kind].compiled!.Y;
    expect(fn({ S: 0, A: 1, B: 0 })).toBe(1);
    expect(fn({ S: 1, A: 0, B: 1 })).toBe(1);
    expect(fn({ S: 0, A: 0, B: 1 })).toBe(0);
  });

  it("throws on invalid name", () => {
    expect(() => defineCustom("", "A", "Y = A")).toThrow();
  });

  it("throws on empty inputs", () => {
    expect(() => defineCustom("TEST", "", "Y = A")).toThrow();
  });

  it("duplicateCustom clones a component", () => {
    defineCustom("MUX2", "S, A, B", "Y = (not S and A) or (S and B)");
    const newKind = duplicateCustom("CUSTOM:MUX2", "MUX2_COPY");
    expect(CUSTOM[newKind]).toBeDefined();
    expect(CUSTOM[newKind].inputs).toEqual(["S", "A", "B"]);
  });

  it("renameCustom renames and deletes old", () => {
    defineCustom("ORIG", "A, B", "Y = A or B");
    const newKind = renameCustom("CUSTOM:ORIG", "RENAMED");
    expect(newKind).toBe("CUSTOM:RENAMED");
    expect(CUSTOM["CUSTOM:RENAMED"]).toBeDefined();
    expect(CUSTOM["CUSTOM:ORIG"]).toBeUndefined();
  });

  it("portsOf works for REG with dynamic width", () => {
    const node = { id: "r", type: "logic", position: { x: 0, y: 0 }, data: { kind: "REG", width: 8 } } as RFNode;
    const p = portsOf(node);
    expect(p.inputs.length).toBe(11); // 8 D bits + CLK + EN + RST
    expect(p.outputs.length).toBe(8);
    expect(p.inputs[0]).toBe("D0");
    expect(p.inputs[8]).toBe("CLK");
    expect(p.outputs[7]).toBe("Q7");
  });

  it("regWidth returns configured width", () => {
    const node = { id: "r", type: "logic", position: { x: 0, y: 0 }, data: { kind: "REG", width: 16 } } as RFNode;
    expect(regWidth(node)).toBe(16);
  });
});
