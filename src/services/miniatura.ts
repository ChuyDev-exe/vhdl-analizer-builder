// SPDX-License-Identifier: MIT
/* Genera una miniatura SVG a partir de nodes/edges de un circuito. */

const KIND_COLORS: Record<string, string> = {
  INPUT: "#4f8cff",
  CLOCK: "#7c5cff",
  OUTPUT: "#34d399",
  AND: "#f59e0b",
  OR: "#f59e0b",
  XOR: "#f59e0b",
  NOT: "#f59e0b",
  NAND: "#f59e0b",
  NOR: "#f59e0b",
  DFF: "#e5b567",
  TFF: "#e5b567",
  JKFF: "#e5b567",
  SRFF: "#e5b567",
  REG: "#e5b567",
  BUSIN: "#60a5fa",
  BUSOUT: "#60a5fa",
  MERGE: "#60a5fa",
  SPLIT: "#60a5fa",
  ROM: "#a78bfa",
  RAM: "#a78bfa",
};

const ICON_MAP: Record<string, string> = {
  INPUT: "IN",
  OUTPUT: "OUT",
  CLOCK: "CLK",
  AND: "&",
  OR: "≥1",
  XOR: "=1",
  NOT: "1",
  NAND: "&",
  NOR: "≥1",
  DFF: "D",
  TFF: "T",
  JKFF: "JK",
  SRFF: "SR",
  REG: "REG",
  BUSIN: "BUS",
  BUSOUT: "BUS",
  MERGE: "M",
  SPLIT: "S",
  ROM: "ROM",
  RAM: "RAM",
};

export function generateThumbnail(nodes: any[], _edges: any[], width = 280, height = 160): string {
  if (!nodes || nodes.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="none">
      <rect width="${width}" height="${height}" rx="8" fill="#111" />
      <text x="${width / 2}" y="${height / 2}" text-anchor="middle" fill="#555" font-size="12" font-family="monospace">Sin componentes</text>
    </svg>`;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const posMap = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const px = n.position?.x ?? 0;
    const py = n.position?.y ?? 0;
    posMap.set(n.id, { x: px, y: py });
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }

  const pad = 16;
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scaleX = (width - pad * 2) / rangeX;
  const scaleY = (height - pad * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY, 2.5);

  const tx = (x: number) => pad + (x - minX) * scale;
  const ty = (y: number) => pad + (y - minY) * scale;
  const bw = Math.max(6, 24 * Math.min(1, scale / 1.2));
  const bh = Math.max(5, 16 * Math.min(1, scale / 1.2));

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" fill="none">
    <rect width="${width}" height="${height}" rx="8" fill="#111" />`;

  for (const edge of _edges) {
    const src = posMap.get(edge.source);
    const tgt = posMap.get(edge.target);
    if (!src || !tgt) continue;
    const x1 = tx(src.x);
    const y1 = ty(src.y) + bh / 2;
    const x2 = tx(tgt.x);
    const y2 = ty(tgt.y) + bh / 2;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="1.5" />`;
  }

  for (const n of nodes) {
    const p = posMap.get(n.id);
    if (!p) continue;
    const x = tx(p.x);
    const y = ty(p.y);
    const kind = n.data?.kind || "?";
    const color = KIND_COLORS[kind] || "#888";
    const icon = ICON_MAP[kind] || kind.slice(0, 3);

    svg += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="3" stroke="${color}" stroke-width="1" fill="rgba(255,255,255,0.03)" />`;
    svg += `<text x="${x + bw / 2}" y="${y + bh / 2 + 1}" text-anchor="middle" fill="${color}" font-size="${Math.min(6, bh * 0.35)}" font-family="monospace" opacity="0.7">${icon}</text>`;
  }

  svg += `</svg>`;
  return svg;
}
