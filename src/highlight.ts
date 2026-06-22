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

/* Auto-completado VHDL: lista de palabras clave y fragmentos */
export const VHDL_COMPLETIONS = [
  { word: "entity", snippet: "entity ${1:name} is\n  port (\n    ${2}\n  );\nend ${1:name};" },
  { word: "architecture", snippet: "architecture ${1:rtl} of ${2:entity} is\n  signal ${3}\nbegin\n  ${4}\nend ${1:rtl};" },
  { word: "process", snippet: "process(${1:clk})\nbegin\n  ${2}\nend process;" },
  { word: "if", snippet: "if ${1:cond} then\n  ${2}\nend if;" },
  { word: "elsif", snippet: "elsif ${1:cond} then" },
  { word: "else", snippet: "else\n  ${1}" },
  { word: "case", snippet: "case ${1:sel} is\n  when '0' =>\n    ${2}\n  when others =>\n    ${3}\nend case;" },
  { word: "when", snippet: "when ${1:val} =>" },
  { word: "for", snippet: "for ${1:i} in ${2:0} to ${3:N} loop\n  ${4}\nend loop;" },
  { word: "generate", snippet: "${1:gen}: for ${2:i} in ${3:0} to ${4:N} generate\n  ${5}\nend generate;" },
  { word: "signal", snippet: "signal ${1:name} : ${2:std_logic};" },
  { word: "variable", snippet: "variable ${1:name} : ${2:std_logic};" },
  { word: "constant", snippet: "constant ${1:name} : ${2:std_logic} := ${3:'0'};" },
  { word: "component", snippet: "component ${1:name} is\n  port (\n    ${2}\n  );\nend component;" },
  { word: "port", snippet: "port (\n  ${1}\n);" },
  { word: "rising_edge", snippet: "rising_edge(${1:clk})" },
  { word: "falling_edge", snippet: "falling_edge(${1:clk})" },
  { word: "wait", snippet: "wait until rising_edge(${1:clk});" },
  { word: "others", snippet: "others" },
  { word: "downto", snippet: "downto" },
  { word: "to", snippet: "to" },
  { word: "std_logic", snippet: "std_logic" },
  { word: "std_logic_vector", snippet: "std_logic_vector(${1:N} downto 0)" },
  { word: "unsigned", snippet: "unsigned" },
  { word: "signed", snippet: "signed" },
  { word: "numeric_std", snippet: "numeric_std" },
];

/* Obtener completaciones para el texto antes del cursor */
export function getVhdlCompletions(word: string): Array<{ word: string; snippet: string }> {
  if (!word) return [];
  const low = word.toLowerCase();
  return VHDL_COMPLETIONS.filter((c) => c.word.startsWith(low)).slice(0, 10);
}

/* Formateador simple de VHDL */
export function formatVhdl(code: string): string {
  const lines = code.split("\n");
  const out: string[] = [];
  let indent = 0;
  const INDENT_UP = /\b(?:is|port|begin|if|then|else|elsif|for|loop|generate|case|when|process)\b/i;
  const INDENT_DOWN = /\b(?:end|else|elsif)\b/i;
  for (let line of lines) {
    const trimmed = line.trim();
    // Reducir indentación si la línea empieza con palabras de cierre
    if (INDENT_DOWN.test(trimmed) && !/\bif\b/.test(trimmed)) indent = Math.max(0, indent - 1);
    out.push("  ".repeat(indent) + trimmed);
    // Aumentar indentación después de palabras de apertura
    if (INDENT_UP.test(trimmed) && !/end\b/.test(trimmed)) indent++;
    // end reduce
    if (/\bend\b/i.test(trimmed)) indent = Math.max(0, indent - 1);
  }
  return out.join("\n");
}
