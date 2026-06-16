// SPDX-License-Identifier: MIT
/* Parser de expresiones booleanas estilo VHDL.
   Gramática (precedencia: not > and/nand > or/nor/xor/xnor):
     expr   := term  ((or|nor|xor|xnor) term)*
     term   := unary ((and|nand) unary)*
     unary  := 'not' unary | primary
     primary:= '(' expr ')' | ident | '0' | '1'
*/

export type Ast = { lit: number } | { ref: string } | { op: "not"; l: Ast } | { op: "and" | "or" | "nand" | "nor" | "xor" | "xnor"; l: Ast; r: Ast };

type Tok = { t: string; v?: string | number };

const OPS = ["and", "or", "not", "nand", "nor", "xor", "xnor"];

function lex(str: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "(" || ch === ")") {
      toks.push({ t: ch });
      i++;
      continue;
    }
    if (ch === "'") {
      const m = /^'([01])'/.exec(str.slice(i));
      if (!m) throw new Error("literal inválido");
      toks.push({ t: "lit", v: +m[1] });
      i += m[0].length;
      continue;
    }
    // identificador, opcionalmente con índice de vector: nombre(3)
    const m = /^[A-Za-z_][A-Za-z0-9_]*(\(\d+\))?/.exec(str.slice(i));
    if (m) {
      const w = m[0].toLowerCase();
      if (OPS.includes(w)) toks.push({ t: "op", v: w });
      else toks.push({ t: "id", v: m[0] });
      i += m[0].length;
      continue;
    }
    throw new Error("carácter inesperado: " + ch);
  }
  return toks;
}

export function parseExpr(str: string): Ast {
  const toks = lex(str);
  let p = 0;
  const peek = () => toks[p];
  const eat = () => toks[p++];

  function primary(): Ast {
    const tk = peek();
    if (!tk) throw new Error("expresión incompleta");
    if (tk.t === "(") {
      eat();
      const e = expr();
      if (!peek() || peek().t !== ")") throw new Error("falta ')'");
      eat();
      return e;
    }
    if (tk.t === "lit") {
      eat();
      return { lit: tk.v as number };
    }
    if (tk.t === "id") {
      eat();
      return { ref: tk.v as string };
    }
    throw new Error("token inesperado");
  }
  function unary(): Ast {
    if (peek() && peek().t === "op" && peek().v === "not") {
      eat();
      return { op: "not", l: unary() };
    }
    return primary();
  }
  // En VHDL los operadores lógicos binarios (and/or/nand/nor/xor/xnor) tienen
  // la MISMA precedencia y asocian de izquierda a derecha; solo `not` es mayor.
  const BIN = ["and", "or", "nand", "nor", "xor", "xnor"];
  function expr(): Ast {
    let l = unary();
    while (peek() && peek().t === "op" && BIN.includes(peek().v as string))
      l = { op: eat().v as "and" | "or" | "nand" | "nor" | "xor" | "xnor", l, r: unary() };
    return l;
  }
  const ast = expr();
  if (p < toks.length) throw new Error("tokens sobrantes");
  return ast;
}

function astToJs(ast: Ast): string {
  if ("lit" in ast) return String(ast.lit);
  if ("ref" in ast) return `(i[${JSON.stringify(ast.ref)}]||0)`;
  const a = astToJs(ast.l);
  const b = "r" in ast ? astToJs(ast.r) : "";
  switch (ast.op) {
    case "not":
      return `(${a}?0:1)`;
    case "and":
      return `(${a}&${b})`;
    case "or":
      return `(${a}|${b})`;
    case "xor":
      return `(${a}^${b})`;
    case "nand":
      return `((${a}&${b})?0:1)`;
    case "nor":
      return `((${a}|${b})?0:1)`;
    case "xnor":
      return `((${a}^${b})?0:1)`;
  }
}

export function compileExpr(str: string): (i: Record<string, number>) => number {
  // eslint-disable-next-line no-new-func
  return new Function("i", "return " + astToJs(parseExpr(str)) + ";") as any;
}
