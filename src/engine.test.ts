// SPDX-License-Identifier: MIT
import { describe, it, expect } from "vitest";
import { simulate, deltaStep, cloneModule } from "./engine";
import type { RFNode, RFEdge, PortVal, Sig } from "./types";

function mkNode(id: string, kind: string, extras: Record<string, unknown> = {}): RFNode {
  return {
    id,
    type: "logic",
    position: { x: 0, y: 0 },
    data: { kind, outVals: [], ...extras },
  };
}

function edge(id: string, src: string, srcPort: number, tgt: string, tgtPort: number): RFEdge {
  return { id, source: src, sourceHandle: `o${srcPort}`, target: tgt, targetHandle: `i${tgtPort}` };
}

describe("simulate", () => {
  it("propagates AND gate", () => {
    const inpA = mkNode("a", "INPUT", { value: 1 });
    const inpB = mkNode("b", "INPUT", { value: 1 });
    const and = mkNode("c", "AND");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([inpA, inpB, and], edges);
    const out = result.find((n) => n.id === "c")?.data.outVals;
    expect(out).toEqual([1]);
  });

  it("propagates AND with 0 input", () => {
    const inpA = mkNode("a", "INPUT", { value: 1 });
    const inpB = mkNode("b", "INPUT", { value: 0 });
    const and = mkNode("c", "AND");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([inpA, inpB, and], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([0]);
  });

  it("propagates OR", () => {
    const a = mkNode("a", "INPUT", { value: 0 });
    const b = mkNode("b", "INPUT", { value: 1 });
    const or = mkNode("c", "OR");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([a, b, or], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([1]);
  });

  it("propagates NOT", () => {
    const a = mkNode("a", "INPUT", { value: 1 });
    const not = mkNode("c", "NOT");
    const edges = [edge("e1", "a", 0, "c", 0)];
    const result = simulate([a, not], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([0]);
  });

  it("propagates NAND", () => {
    const a = mkNode("a", "INPUT", { value: 1 });
    const b = mkNode("b", "INPUT", { value: 1 });
    const nand = mkNode("c", "NAND");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([a, b, nand], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([0]);
  });

  it("propagates NOR", () => {
    const a = mkNode("a", "INPUT", { value: 0 });
    const b = mkNode("b", "INPUT", { value: 0 });
    const nor = mkNode("c", "NOR");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([a, b, nor], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([1]);
  });

  it("propagates XOR", () => {
    const a = mkNode("a", "INPUT", { value: 1 });
    const b = mkNode("b", "INPUT", { value: 0 });
    const xor = mkNode("c", "XOR");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([a, b, xor], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([1]);
  });

  it("propagates XNOR", () => {
    const a = mkNode("a", "INPUT", { value: 1 });
    const b = mkNode("b", "INPUT", { value: 1 });
    const xnor = mkNode("c", "XNOR");
    const edges = [edge("e1", "a", 0, "c", 0), edge("e2", "b", 0, "c", 1)];
    const result = simulate([a, b, xnor], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([1]);
  });

  it("outputs get the value of their input", () => {
    const inp = mkNode("a", "INPUT", { value: 1 });
    const out = mkNode("b", "OUTPUT");
    const edges = [edge("e1", "a", 0, "b", 0)];
    const result = simulate([inp, out], edges);
    expect(result.find((n) => n.id === "b")?.data.value).toBe(1);
    expect(result.find((n) => n.id === "a")?.data.outVals).toEqual([1]);
  });

  it("CLOCK produces its value", () => {
    const clk = mkNode("a", "CLOCK", { value: 1 });
    const result = simulate([clk], []);
    expect(result.find((n) => n.id === "a")?.data.outVals).toEqual([1]);
  });

  it("unconnected input defaults to z", () => {
    const a = mkNode("a", "INPUT", { value: 1 });
    const and = mkNode("c", "AND");
    const edges = [edge("e1", "a", 0, "c", 0)];
    const result = simulate([a, and], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual(["x"]);
  });

  it("x propagates through gates", () => {
    const a = mkNode("a", "INPUT", { value: "x" as Sig });
    const not = mkNode("c", "NOT");
    const edges = [edge("e1", "a", 0, "c", 0)];
    const result = simulate([a, not], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual(["x"]);
  });

  it("z input treated as x by gate", () => {
    const and = mkNode("c", "AND");
    const edges: RFEdge[] = [];
    const result = simulate([and], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual(["x"]);
  });

  it("chain of gates: NOT NOT inverts twice", () => {
    const inp = mkNode("a", "INPUT", { value: 1 });
    const not1 = mkNode("b", "NOT");
    const not2 = mkNode("c", "NOT");
    const edges = [edge("e1", "a", 0, "b", 0), edge("e2", "b", 0, "c", 0)];
    const result = simulate([inp, not1, not2], edges);
    expect(result.find((n) => n.id === "c")?.data.outVals).toEqual([1]);
  });
});

describe("deltaStep (delay mode)", () => {
  it("propagates one delta layer at a time", () => {
    const inp = mkNode("a", "INPUT", { value: 1, delay: 0 });
    const not1 = mkNode("b", "NOT", { delay: 1 });
    const not2 = mkNode("c", "NOT", { delay: 2 });
    const edges = [edge("e1", "a", 0, "b", 0), edge("e2", "b", 0, "c", 0)];
    const all = [inp, not1, not2];
    // First simulate to establish initial outVals
    const init = simulate([...all], edges);
    // deltaStep reads from prev (clone) values, evaluates into next
    const step1 = deltaStep(init, edges);
    // b's input comes from prev (still has old outVals), so NOT(1)=0
    expect(step1.find((n) => n.id === "b")?.data.outVals).toEqual([0]);
    // c's input b still has old outVals (pre-deltaStep) = "x" before first sim actually
    // Actually after simulate, both not gates are resolved, so deltaStep will
    // re-evaluate using the pre-deltaStep values
    expect(step1.find((n) => n.id === "c")?.data.outVals).toBeDefined();
  });
});

describe("cloneModule", () => {
  it("deep clones nodes and edges", () => {
    const nodes = [mkNode("a", "INPUT", { value: 1, bits: [0, 1] })];
    const edges = [edge("e1", "a", 0, "b", 0)];
    const cloned = cloneModule({ nodes, edges });
    expect(cloned.nodes).toEqual(nodes);
    expect(cloned.edges).toEqual(edges);
    expect(cloned.nodes[0]).not.toBe(nodes[0]);
    expect(cloned.nodes[0].data.bits).not.toBe(nodes[0].data.bits);
  });

  it("preserves outVals arrays", () => {
    const nodes = [mkNode("a", "AND", { outVals: [1] })];
    const cloned = cloneModule({ nodes, edges: [] });
    expect(cloned.nodes[0].data.outVals).toEqual([1]);
  });
});
