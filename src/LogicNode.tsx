// SPDX-License-Identifier: MIT
import { useContext } from "react";
import { useI18n } from "./i18n";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { getDef, isGate, isFF, isBus, isBusInput, isBusOutput, portsOf } from "./defs";
import { CircuitCtx } from "./ctx";
import type { NodeData, Sig, PortVal } from "./types";

const SIG_COLOR: Record<string, string> = { "1": "var(--on)", "0": "var(--off)", x: "#a3a3a3", z: "#52525b" };

function ledColor(v: PortVal | undefined): string {
  if (Array.isArray(v)) {
    if (v.some((b) => b === "x")) return SIG_COLOR.x;
    if (v.some((b) => b === "z")) return SIG_COLOR.z;
    return v.some((b) => b === 1) ? SIG_COLOR["1"] : SIG_COLOR["0"];
  }
  return SIG_COLOR[String(v ?? "z")] || SIG_COLOR["0"];
}
const led = (v: PortVal | undefined) => ({ background: ledColor(v) });

const hex = (bits: Sig[] | undefined): string => {
  if (!bits || !bits.length) return "0";
  if (bits.some((b) => b !== 0 && b !== 1)) return "X";
  return bits
    .reduce<number>((a, b, i) => a + ((b as number) << i), 0)
    .toString(16)
    .toUpperCase();
};
const hexToBits = (s: string, w: number): Sig[] => {
  const v = parseInt(s || "0", 16) || 0;
  return Array.from({ length: w }, (_, i) => ((v >> i) & 1) as Sig);
};

const WIDTHS = [2, 4, 8, 16];

function GateBody({ kind }: { kind: string }) {
  const { t } = useI18n();
  const hasNot = kind === "NOT" || kind === "NAND" || kind === "NOR" || kind === "XNOR";
  const isXor = kind === "XOR" || kind === "XNOR";
  let body = "";
  switch (kind) {
    case "AND":
    case "NAND":
      body = "M 12,6 L 38,6 C 56,6 64,15 64,25 C 64,35 56,44 38,44 L 12,44 Z";
      break;
    case "OR":
    case "NOR":
      body = "M 12,6 C 28,6 48,15 62,25 C 48,35 28,44 12,44 C 20,34 20,16 12,6 Z";
      break;
    case "XOR":
    case "XNOR":
      body = "M 14,6 C 30,6 48,15 62,25 C 48,35 30,44 14,44 C 22,34 22,16 14,6 Z";
      break;
    case "NOT":
      body = "M 12,6 L 54,25 L 12,44 Z";
      break;
  }
  return (
    <svg className="lnode-gate" viewBox="0 0 72 52" role="img" aria-label={t("logic.gate_aria", { kind })}>
      <title>{t("logic.gate_title", { kind })}</title>
      <desc>{t("logic.gate_desc", { kind })}</desc>
      {isXor && <path d="M 10,6 Q 4,15 4,25 Q 4,35 10,44" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />}
      <path d={body} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {hasNot && <circle cx="60" cy="25" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />}
    </svg>
  );
}

function IoSvg({ kind }: { kind: string }) {
  const { t } = useI18n();
  const title = kind === "INPUT" ? t("logic.io_in") : kind === "OUTPUT" ? t("logic.io_out") : t("logic.io_clk");
  if (kind === "INPUT")
    return (
      <svg className="lnode-io-svg" viewBox="0 0 50 32" role="img" aria-label={t("logic.io_port_aria", { kind: title })}>
        <title>{t("logic.io_port_aria", { kind: title })}</title>
        <desc>{t("logic.io_in_desc")}</desc>
        <path d="M 4,16 L 38,4 Q 46,16 38,28 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  if (kind === "OUTPUT")
    return (
      <svg className="lnode-io-svg" viewBox="0 0 50 32" role="img" aria-label={t("logic.io_port_aria", { kind: title })}>
        <title>{t("logic.io_port_aria", { kind: title })}</title>
        <desc>{t("logic.io_out_desc")}</desc>
        <path d="M 46,16 L 12,4 Q 4,16 12,28 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg className="lnode-io-svg" viewBox="0 0 50 34" role="img" aria-label={t("logic.io_port_aria", { kind: title })}>
      <title>{t("logic.io_port_aria", { kind: title })}</title>
      <desc>{t("logic.io_clk_desc")}</desc>
      <circle cx="25" cy="17" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 25,6 L 25,28 M 17,12 L 25,17 L 33,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FfSvg({ kind, clockY }: { kind: string; clockY: number }) {
  const { t } = useI18n();
  return (
    <svg className="lnode-ff-bg" viewBox="0 0 120 84" role="img" aria-label={t("logic.ff_aria", { kind })}>
      <title>{t("logic.ff_title", { kind })}</title>
      <desc>{t("logic.ff_desc")}</desc>
      <rect x="4" y="4" width="112" height="76" rx="6" fill="var(--panel-2)" stroke="currentColor" strokeWidth="1.5" />
      <polygon points={`7,${clockY} 17,${clockY + 6} 7,${clockY + 12}`} fill="var(--panel-2)" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function BusSvg({ kind, w }: { kind: string; w: number }) {
  const label = { BUSIN: "BUS-IN", BUSOUT: "BUS-OUT", SPLIT: "SPLIT", MERGE: "MERGE" }[kind] || kind;
  const Lx = 6,
    Rx = 114,
    busEnd = 34,
    busStart = 86;
  const busYs = [18, 29, 40];
  const bitCount = Math.min(w, 6);
  const bitYs = Array.from({ length: bitCount }, (_, i) => {
    const t = (i + 0.5) / bitCount;
    return 6 + t * 52;
  });
  const midY = 32;

  return (
    <svg className="lnode-bus-svg" viewBox="0 0 120 64" role="img" aria-label={`${label} ${w}b`}>
      <title>{`${label} ${w}b`}</title>
      <desc>{`Bus ${label} de ${w} bits`}</desc>
      <rect x="2" y="2" width="116" height="60" rx="8" fill="var(--bus-bg)" stroke="var(--bus-border)" strokeWidth="1.5" />
      {kind === "BUSIN" && (
        <>
          <path
            d="M 6,32 L 28,16 Q 40,32 28,48 Z"
            fill="var(--bus-accent)"
            fillOpacity=".12"
            stroke="var(--bus-accent)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {busYs.map((y) => (
            <line key={y} x1="28" y1={y} x2={Rx} y2={y} stroke="var(--bus-accent)" strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
          ))}
          <text x="70" y="11" textAnchor="middle" fill="var(--bus-accent)" fontSize="9" fontFamily="monospace" fontWeight="600">
            BUS-IN
          </text>
        </>
      )}
      {kind === "BUSOUT" && (
        <>
          <path
            d={`M ${Rx},32 L 92,16 Q 80,32 92,48 Z`}
            fill="var(--bus-accent)"
            fillOpacity=".12"
            stroke="var(--bus-accent)"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {busYs.map((y) => (
            <line key={y} x1={Lx} y1={y} x2="92" y2={y} stroke="var(--bus-accent)" strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
          ))}
          <text x="50" y="11" textAnchor="middle" fill="var(--bus-accent)" fontSize="9" fontFamily="monospace" fontWeight="600">
            BUS-OUT
          </text>
        </>
      )}
      {kind === "SPLIT" && (
        <>
          <rect x={busEnd - 2} y="16" width="4" height="32" rx="2" fill="var(--bus-accent)" fillOpacity=".2" />
          {busYs.map((y) => (
            <line key={y} x1={Lx} y1={y} x2={busEnd} y2={y} stroke="var(--bus-accent)" strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
          ))}
          {bitYs.map((y, i) => {
            const sy = i < 3 ? busYs[i] : midY;
            return (
              <g key={y}>
                <path
                  d={`M ${busEnd + 2},${sy} C ${busEnd + 14},${sy} ${Rx - 18},${y} ${Rx},${y}`}
                  fill="none"
                  stroke="var(--bus-accent)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity=".5"
                />
                <text x={Rx + 1} y={y + 1} textAnchor="start" fill="var(--bus-accent)" fontSize="7" fontFamily="monospace" opacity=".75">{`b${i}`}</text>
              </g>
            );
          })}
          <text x="70" y="11" textAnchor="middle" fill="var(--bus-accent)" fontSize="9" fontFamily="monospace" fontWeight="600">{`SPLIT ${w}b`}</text>
        </>
      )}
      {kind === "MERGE" && (
        <>
          <rect x={busStart - 2} y="16" width="4" height="32" rx="2" fill="var(--bus-accent)" fillOpacity=".2" />
          {busYs.map((y) => (
            <line key={y} x1={busStart} y1={y} x2={Rx} y2={y} stroke="var(--bus-accent)" strokeWidth="1.8" strokeLinecap="round" opacity=".55" />
          ))}
          {bitYs.map((y, i) => {
            const ty = i < 3 ? busYs[i] : midY;
            return (
              <g key={y}>
                <path
                  d={`M ${Lx},${y} C ${Lx + 18},${y} ${busStart - 14},${ty} ${busStart - 2},${ty}`}
                  fill="none"
                  stroke="var(--bus-accent)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity=".5"
                />
                <text x={Lx - 1} y={y + 1} textAnchor="end" fill="var(--bus-accent)" fontSize="7" fontFamily="monospace" opacity=".75">{`b${i}`}</text>
              </g>
            );
          })}
          <text x="56" y="11" textAnchor="middle" fill="var(--bus-accent)" fontSize="9" fontFamily="monospace" fontWeight="600">{`MERGE ${w}b`}</text>
        </>
      )}
    </svg>
  );
}

export default function LogicNode({ id, data, selected }: NodeProps) {
  const { t } = useI18n();
  const d = data as NodeData;
  const def = getDef(d.kind);
  const { setRegWidth, setNodeData } = useContext(CircuitCtx);
  if (!def) return null;

  const gate = isGate(d.kind);
  const io = ["INPUT", "OUTPUT", "CLOCK"].includes(d.kind);
  const isReg = d.kind === "REG";
  const ff = isFF(d.kind);
  const isSeq = isReg || ff;
  const busNode = isBus(d.kind);
  const w = (d.width as number) || 4;
  const stop = (e: React.PointerEvent) => e.stopPropagation();

  const ports = portsOf({ data: d } as any);
  const { inputs, outputs } = ports;
  const rows = Math.max(inputs.length, outputs.length, 1);
  const height = isReg ? 44 + w * 22 + 18 : busNode ? Math.max(64, rows * 22 + 34) : gate ? 56 : ff ? 84 : io ? 44 : rows <= 1 ? 50 : 26 + rows * 22;
  const width = isReg ? 132 : busNode ? 118 : gate ? 86 : ff ? 120 : io ? 64 : def.custom ? Math.max(86, def.label.length * 10 + 26) : 92;
  const topFor = (i: number, n: number) => `${((i + 1) / (n + 1)) * 100}%`;

  const setBusWidth = (n: number) => setNodeData(id, { width: n, bits: hexToBits(hex(d.bits), n) });

  return (
    <div
      className={`lnode ${gate ? "k-gate" : ""} ${ff ? "k-ff" : ""} ${io ? `k-io k-${d.kind.toLowerCase()}` : ""} ${busNode ? "k-bus" : ""} ${d.kind === "REG" ? "k-reg" : ""} ${d.kind.startsWith("CUSTOM:") ? "k-custom" : ""} k-${d.kind.replace(":", "-")} ${selected ? "sel" : ""} ${d._loop ? "loop" : ""}`}
      style={{ width, height }}
      title={d._loop ? t("logic.loop_title") : undefined}
    >
      {gate && <GateBody kind={d.kind} />}
      {ff && <FfSvg kind={d.kind} clockY={d.kind === "JKFF" || d.kind === "SRFF" ? 37 : 28} />}
      {io && <IoSvg kind={d.kind} />}
      {busNode && <BusSvg kind={d.kind} w={w} />}

      {inputs.map((_, i) => (
        <Handle
          key={"i" + i}
          type="target"
          position={Position.Left}
          id={"i" + i}
          className={isBusInput(d.kind, i) ? "bus" : ""}
          style={{ top: topFor(i, inputs.length), ...led(d.inVals?.[i]) }}
        />
      ))}
      {outputs.map((_, i) => (
        <Handle
          key={"o" + i}
          type="source"
          position={Position.Right}
          id={"o" + i}
          className={isBusOutput(d.kind, i) ? "bus" : ""}
          style={{ top: topFor(i, outputs.length), ...led(d.outVals?.[i]) }}
        />
      ))}

      <div className="lnode-content">
        {io && d.label && <div className="lnode-port-name">{d.label}</div>}

        <div className="lnode-title">
          {isReg ? (
            <>
              REG{" "}
              <select
                className="nodrag reg-width"
                value={w}
                title={t("logic.reg_width")}
                onChange={(e) => setRegWidth(id, +e.target.value)}
                onPointerDown={stop}
              >
                {WIDTHS.map((n) => (
                  <option key={n} value={n}>
                    {n}b
                  </option>
                ))}
              </select>
            </>
          ) : !busNode ? (
            def.label
          ) : null}
        </div>

        {io && (
          <>
            <div className="lnode-led" style={led(d.value)} />
            {d.kind === "CLOCK" && (
              <select
                className="nodrag reg-width"
                title={t("logic.clk_div")}
                value={(d.div as number) || 1}
                onChange={(e) => setNodeData(id, { div: +e.target.value })}
                onPointerDown={stop}
              >
                {[1, 2, 4, 8].map((n) => (
                  <option key={n} value={n}>
                    ÷{n}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        {busNode && (
          <div className="lnode-bus">
            <div className="lnode-bus-row">
              <select className="nodrag reg-width" value={w} title={t("logic.bus_width")} onChange={(e) => setBusWidth(+e.target.value)} onPointerDown={stop}>
                {WIDTHS.map((n) => (
                  <option key={n} value={n}>
                    {n}b
                  </option>
                ))}
              </select>
              {d.kind === "BUSIN" && (
                <input
                  className="nodrag bus-hex"
                  value={hex(d.bits)}
                  title={t("logic.bus_hex")}
                  onChange={(e) => setNodeData(id, { bits: hexToBits(e.target.value.replace(/[^0-9a-fA-F]/g, ""), w) })}
                  onPointerDown={stop}
                />
              )}
              {(d.kind === "BUSOUT" || d.kind === "MERGE") && <span className="bus-val">0x{hex(d.kind === "MERGE" ? (d.outVals?.[0] as Sig[]) : d.bits)}</span>}
            </div>
          </div>
        )}

        {isSeq && (
          <select
            className="nodrag reg-width lnode-init"
            title={t("logic.init_val")}
            value={String(d.init ?? 0)}
            onChange={(e) => setNodeData(id, { init: (e.target.value === "x" ? "x" : +e.target.value) as Sig })}
            onPointerDown={stop}
          >
            {["0", "1", "x"].map((v) => (
              <option key={v} value={v}>
                init={v}
              </option>
            ))}
          </select>
        )}

        {isReg && (
          <div className="lnode-bits">
            {(d.bits || []).map((b, i) => (
              <div className="lnode-bit" key={i}>
                <span className="lnode-bit-led" style={led(b)} />
                <span className="lnode-bit-lbl">b{i}</span>
              </div>
            ))}
          </div>
        )}

        {(isReg || def.custom || ff || inputs.length + outputs.length > 2) && (
          <>
            {inputs.map((nm, i) => (
              <span key={"li" + i} className="lnode-hlbl in" style={{ top: topFor(i, inputs.length) }}>
                {nm}
              </span>
            ))}
            {outputs.map((nm, i) => (
              <span key={"lo" + i} className="lnode-hlbl out" style={{ top: topFor(i, outputs.length) }}>
                {nm}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
