// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState, type ElementType } from "react";
import { FiChevronDown } from "react-icons/fi";

export interface DropdownItem {
  label?: string;
  icon?: ElementType;
  onClick?: () => void;
  danger?: boolean;
  separator?: boolean;
}

export function HeaderDropdown({ label, icon: Icon, items }: { label: string; icon?: ElementType; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof MouseEvent && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (e instanceof KeyboardEvent && e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button className="btn dropdown-trigger" onClick={() => setOpen((o) => !o)} aria-haspopup="true" aria-expanded={open}>
        {Icon && <Icon size={14} />}
        <span>{label}</span>
        <FiChevronDown size={11} className={"dropdown-arrow" + (open ? " open" : "")} />
      </button>
      {open && (
        <div className="dropdown-menu" role="menu">
          {items.map((item, i) =>
            item.separator ? (
              <div key={"sep" + i} className="dropdown-sep" />
            ) : (
              <button
                key={item.label || String(i)}
                className={"dropdown-item" + (item.danger ? " danger" : "")}
                role="menuitem"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
              >
                {item.icon && <item.icon size={14} />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
