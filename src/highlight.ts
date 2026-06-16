// SPDX-License-Identifier: MIT
const KEYWORDS = new Set([
  "entity",
  "architecture",
  "is",
  "of",
  "begin",
  "end",
  "port",
  "map",
  "in",
  "out",
  "inout",
  "signal",
  "variable",
  "constant",
  "type",
  "subtype",
  "function",
  "procedure",
  "process",
  "if",
  "then",
  "else",
  "elsif",
  "for",
  "loop",
  "while",
  "generate",
  "component",
  "when",
  "others",
  "to",
  "downto",
  "range",
  "not",
  "and",
  "or",
  "nand",
  "nor",
  "xor",
  "xnor",
  "with",
  "select",
  "case",
  "generic",
  "all",
  "work",
  "library",
  "use",
  "rising_edge",
  "falling_edge",
  "wait",
  "until",
  "after",
  "transport",
  "buffer",
  "linkage",
  "bus",
  "open",
  "body",
  "new",
  "null",
  "mod",
  "rem",
  "abs",
  "package",
  "configuration",
  "alias",
  "attribute",
  "group",
  "file",
  "access",
  "protected",
  "unaffected",
  "force",
  "release",
  "pure",
  "impure",
  "return",
  "range",
  "severity",
  "note",
  "warning",
  "error",
  "failure",
  "assert",
  "report",
  "postponed",
  "block",
  "exit",
  "next",
  "assert",
  "on",
  "label",
  "literal",
]);

const TYPES = new Set([
  "std_logic",
  "std_logic_vector",
  "integer",
  "boolean",
  "natural",
  "positive",
  "std_ulogic",
  "std_ulogic_vector",
  "bit",
  "bit_vector",
  "signed",
  "unsigned",
  "time",
  "character",
  "string",
  "real",
]);

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlightVhdl(code: string): string {
  const out: string[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    if (code[i] === "-" && code[i + 1] === "-") {
      const end = code.indexOf("\n", i);
      const comment = end === -1 ? code.slice(i) : code.slice(i, end);
      out.push(`<span class="syn-comment">${esc(comment)}</span>`);
      i += comment.length;
      continue;
    }

    if (code[i] === '"') {
      let j = i + 1;
      while (j < len && code[j] !== '"') j++;
      const str = code.slice(i, j + 1);
      out.push(`<span class="syn-string">${esc(str)}</span>`);
      i = j + 1;
      continue;
    }

    if (code[i] === "'" && i + 2 < len && code[i + 2] === "'") {
      out.push(`<span class="syn-string">${esc(code.slice(i, i + 3))}</span>`);
      i += 3;
      continue;
    }

    if (/\d/.test(code[i])) {
      let num = code[i++];
      while (i < len && /[\da-fA-F_#.:]/.test(code[i])) num += code[i++];
      out.push(`<span class="syn-number">${num}</span>`);
      continue;
    }

    if (/[a-zA-Z_]/.test(code[i])) {
      let word = "";
      while (i < len && /[a-zA-Z0-9_]/.test(code[i])) word += code[i++];
      const lower = word.toLowerCase();
      if (KEYWORDS.has(lower)) out.push(`<span class="syn-keyword">${word}</span>`);
      else if (TYPES.has(lower)) out.push(`<span class="syn-type">${word}</span>`);
      else out.push(esc(word));
      continue;
    }

    out.push(esc(code[i]));
    i++;
  }

  return out.join("");
}
