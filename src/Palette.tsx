// SPDX-License-Identifier: MIT
import { useState } from "react";
import { useDrag } from "react-dnd";
import { NODE_DEFS, CUSTOM, type CompDef } from "./defs";
import { useI18n } from "./i18n";

export const DND_TYPE = "LOGIC_COMPONENT";

const CAT_TO_KEY: Record<string, string> = {
  "Entradas / Salidas": "palette.cat_io",
  Compuertas: "palette.cat_gates",
  "Secuencial / Memoria": "palette.cat_seq",
  Buses: "palette.cat_bus",
  Personalizados: "palette.cat_custom",
};

const CAT_TO_EMPTY_KEY: Record<string, string> = {
  Personalizados: "palette.empty_custom",
  Buses: "palette.empty_bus",
  Compuertas: "palette.empty_gates",
  "Secuencial / Memoria": "palette.empty_seq",
  "Entradas / Salidas": "palette.empty_io",
};

function PaletteItem({
  kind,
  def,
  name,
  t,
  onDelete,
}: {
  kind: string;
  def: CompDef;
  name: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onDelete?: (k: string) => void;
}) {
  const [{ isDragging }, dragRef] = useDrag(
    () => ({
      type: DND_TYPE,
      item: { kind },
      collect: (m) => ({ isDragging: m.isDragging() }),
    }),
    [kind],
  );

  return (
    <div
      ref={dragRef as unknown as React.Ref<HTMLDivElement>}
      className="pal-item"
      style={{ opacity: isDragging ? 0.4 : 1 }}
      title={t("palette.item_tooltip", { name })}
      role="button"
      tabIndex={0}
      aria-label={t(def.schematic ? "palette.item_aria_vhdl" : "palette.item_aria", { name })}
      aria-grabbed={isDragging}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
        }
      }}
    >
      <span className="pal-name">{name}</span>
      {def.schematic && <span className="pal-tag">{t("palette.vhdl_tag")}</span>}
      {onDelete && (
        <button
          className="pal-del"
          title={t("palette.delete_title")}
          aria-label={t("palette.delete_aria", { name })}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(kind);
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function Palette({ customVersion, onDeleteCustom }: { customVersion: number; onDeleteCustom?: (k: string) => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("simlog.palette.collapsed") || "{}");
    } catch {
      return {};
    }
  });

  const toggleCat = (cat: string) =>
    setCollapsed((prev) => {
      const next = { ...prev, [cat]: !prev[cat] };
      localStorage.setItem("simlog.palette.collapsed", JSON.stringify(next));
      return next;
    });

  const groups: Record<string, Array<[string, CompDef]>> = {
    "Entradas / Salidas": [],
    Compuertas: [],
    "Secuencial / Memoria": [],
    Buses: [],
    Personalizados: [],
  };
  const all: Record<string, CompDef> = { ...NODE_DEFS, ...CUSTOM };
  const lowFilter = filter.toLowerCase();

  const displayLabel = (def: CompDef) => {
    const key = def.label === "IN" ? "palette.label_in" : def.label === "OUT" ? "palette.label_out" : def.label === "CLK" ? "palette.label_clk" : null;
    return key ? t(key) : def.label;
  };

  for (const kind in all) {
    const d = all[kind];
    const name = displayLabel(d);
    if (filter && !kind.toLowerCase().includes(lowFilter) && !name.toLowerCase().includes(lowFilter) && !d.label.toLowerCase().includes(lowFilter)) continue;
    (groups[d.cat] || groups["Compuertas"]).push([kind, d]);
  }

  const total = Object.values(groups).reduce((s, items) => s + items.length, 0);
  const showFilter = Object.keys(CUSTOM).length > 0 || filter.length > 0;

  return (
    <aside className="palette" role="navigation" aria-label={t("palette.label")}>
      {showFilter && (
        <div className="pal-search">
          <input
            type="text"
            placeholder={t("palette.filter")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t("palette.aria.filter")}
          />
        </div>
      )}
      {total === 0 && !filter && <div className="pal-empty">{t("palette.empty_all")}</div>}
      {total === 0 && filter && <div className="pal-empty">{t("palette.empty_filter", { q: filter })}</div>}
      {Object.entries(groups).map(([cat, items]) => {
        if (items.length === 0 && cat !== "Personalizados") return null;
        // While filtering, keep groups expanded so matches stay visible.
        const isCollapsed = !filter && !!collapsed[cat];
        const catLabel = t(CAT_TO_KEY[cat] || cat);
        return (
          <div className="pal-group" key={cat + customVersion}>
            <button
              type="button"
              className="pal-group-title"
              onClick={() => toggleCat(cat)}
              aria-expanded={!isCollapsed}
              aria-label={t(isCollapsed ? "palette.expand_cat" : "palette.collapse_cat", { cat: catLabel })}
            >
              <span className="pal-chevron" aria-hidden="true">
                {isCollapsed ? "▸" : "▾"}
              </span>
              {catLabel}
              <span className="pal-count">{items.length}</span>
            </button>
            {!isCollapsed && (
              <>
                {items.length === 0 && cat === "Personalizados" && <div className="pal-empty">{t(CAT_TO_EMPTY_KEY[cat] || cat)}</div>}
                {items.map(([kind, def]) => (
                  <PaletteItem key={kind} kind={kind} def={def} name={displayLabel(def)} t={t} onDelete={cat === "Personalizados" ? onDeleteCustom : undefined} />
                ))}
              </>
            )}
          </div>
        );
      })}
    </aside>
  );
}
