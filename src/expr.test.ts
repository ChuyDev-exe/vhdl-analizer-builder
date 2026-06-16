// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { parseExpr, compileExpr } from "./expr";

describe("parseExpr", () => {
  it("parses a literal", () => {
    expect(parseExpr("'0'")).toEqual({ lit: 0 });
    expect(parseExpr("'1'")).toEqual({ lit: 1 });
  });

  it("parses a reference", () => {
    expect(parseExpr("A")).toEqual({ ref: "A" });
    expect(parseExpr("sig_name")).toEqual({ ref: "sig_name" });
    expect(parseExpr("bus(3)")).toEqual({ ref: "bus(3)" });
  });

  it("parses not", () => {
    expect(parseExpr("not A")).toEqual({ op: "not", l: { ref: "A" } });
    expect(parseExpr("not not A")).toEqual({
      op: "not",
      l: { op: "not", l: { ref: "A" } },
    });
  });

  it("parses binary ops with left-to-right precedence", () => {
    const ast = parseExpr("A and B");
    expect(ast).toEqual({ op: "and", l: { ref: "A" }, r: { ref: "B" } });
  });

  it("chains same-precedence ops left to right", () => {
    const ast = parseExpr("A and B and C");
    expect(ast).toEqual({
      op: "and",
      l: { op: "and", l: { ref: "A" }, r: { ref: "B" } },
      r: { ref: "C" },
    });
  });

  it("handles parentheses", () => {
    const ast = parseExpr("A and (B or C)");
    expect(ast).toEqual({
      op: "and",
      l: { ref: "A" },
      r: { op: "or", l: { ref: "B" }, r: { ref: "C" } },
    });
  });

  it("parses all operators", () => {
    const ops = ["and", "or", "nand", "nor", "xor", "xnor"];
    for (const op of ops) {
      const ast = parseExpr(`A ${op} B`);
      expect(ast).toEqual({ op, l: { ref: "A" }, r: { ref: "B" } });
    }
  });

  it("parses VHDL-style literals with quotes", () => {
    expect(parseExpr("'1' and A")).toEqual({
      op: "and",
      l: { lit: 1 },
      r: { ref: "A" },
    });
  });

  it("throws on empty input", () => {
    expect(() => parseExpr("")).toThrow();
  });

  it("throws on trailing tokens", () => {
    expect(() => parseExpr("A B")).toThrow();
  });

  it("throws on unexpected character", () => {
    expect(() => parseExpr("A @ B")).toThrow();
  });

  it("throws on missing closing paren", () => {
    expect(() => parseExpr("(A and B")).toThrow();
  });
});

describe("compileExpr", () => {
  it("compiles a simple AND expression", () => {
    const fn = compileExpr("A and B");
    expect(fn({ A: 1, B: 1 })).toBe(1);
    expect(fn({ A: 1, B: 0 })).toBe(0);
    expect(fn({ A: 0, B: 1 })).toBe(0);
    expect(fn({ A: 0, B: 0 })).toBe(0);
  });

  it("compiles OR", () => {
    const fn = compileExpr("A or B");
    expect(fn({ A: 0, B: 0 })).toBe(0);
    expect(fn({ A: 0, B: 1 })).toBe(1);
    expect(fn({ A: 1, B: 0 })).toBe(1);
    expect(fn({ A: 1, B: 1 })).toBe(1);
  });

  it("compiles NOT", () => {
    const fn = compileExpr("not A");
    expect(fn({ A: 1 })).toBe(0);
    expect(fn({ A: 0 })).toBe(1);
  });

  it("compiles NAND", () => {
    const fn = compileExpr("A nand B");
    expect(fn({ A: 1, B: 1 })).toBe(0);
    expect(fn({ A: 1, B: 0 })).toBe(1);
  });

  it("compiles NOR", () => {
    const fn = compileExpr("A nor B");
    expect(fn({ A: 0, B: 0 })).toBe(1);
    expect(fn({ A: 1, B: 0 })).toBe(0);
  });

  it("compiles XOR", () => {
    const fn = compileExpr("A xor B");
    expect(fn({ A: 0, B: 0 })).toBe(0);
    expect(fn({ A: 0, B: 1 })).toBe(1);
    expect(fn({ A: 1, B: 0 })).toBe(1);
    expect(fn({ A: 1, B: 1 })).toBe(0);
  });

  it("compiles XNOR", () => {
    const fn = compileExpr("A xnor B");
    expect(fn({ A: 0, B: 0 })).toBe(1);
    expect(fn({ A: 1, B: 1 })).toBe(1);
    expect(fn({ A: 0, B: 1 })).toBe(0);
  });

  it("evaluates complex nested expression", () => {
    const fn = compileExpr("(A and B) or (C and not D)");
    expect(fn({ A: 1, B: 1, C: 0, D: 1 })).toBe(1);
    expect(fn({ A: 0, B: 1, C: 0, D: 1 })).toBe(0);
    expect(fn({ A: 0, B: 1, C: 1, D: 0 })).toBe(1);
  });

  it("treats absent inputs as 0", () => {
    const fn = compileExpr("A and B");
    expect(fn({})).toBe(0);
  });
});
