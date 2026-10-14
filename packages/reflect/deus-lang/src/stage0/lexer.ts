//
// Copyright 2026 DXOS.org
//

// Stage0 (bootstrap only): mirrors deus/lexer.deus; deleted once the seed reproduces itself.

export type TokenKind = 'ident' | 'dot' | 'int' | 'text' | 'sym' | 'kw' | 'doc' | 'eof';

export type Token = {
  kind: TokenKind;
  value: string;
  line: number;
  col: number;
  /** First token on its line; drives the offside rule. */
  bol: boolean;
};

export const KEYWORDS = new Set([
  'def',
  'theorem',
  'test',
  'inductive',
  'structure',
  'ability',
  'namespace',
  'end',
  'open',
  'match',
  'with',
  'fun',
  'let',
  'rec',
  'if',
  'then',
  'else',
  'handle',
  'return',
  'by',
  'sorry',
  'where',
  'do',
  'prim',
  'true',
  'false',
  'perf',
  'ext',
]);

// Longest first, so `::` wins over `:` and `:=` over `:`.
const SYMBOLS = [
  ':=',
  '=>',
  '->',
  '<-',
  '::',
  '++',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '|>',
  '<|',
  '@[',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  ',',
  ':',
  '|',
  '@',
  '+',
  '-',
  '*',
  '/',
  '%',
  '<',
  '>',
  '=',
  '!',
  '_',
  ';',
];

const UNICODE: Record<string, string> = { '→': '->', '⇒': '=>', 'λ': 'fun', '≠': '!=', '≤': '<=', '≥': '>=', '×': '*', '←': '<-' };

const isIdentStart = (c: string) => /[A-Za-z_Ͱ-Ͽ]/.test(c);
const isIdentPart = (c: string) => /[A-Za-z0-9_'?!Ͱ-Ͽ]/.test(c);

export class LexError extends Error {}

/** Tokenizes DEUS source; columns are 0-based. */
export const lex = (source: string): Token[] => {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let lineStart = 0;
  let bol = true;
  const len = source.length;

  const push = (kind: TokenKind, value: string, start: number, startLine: number, startCol: number) => {
    tokens.push({ kind, value, line: startLine, col: startCol, bol });
    bol = false;
    void start;
  };

  while (pos < len) {
    const c = source[pos];
    if (c === '\n') {
      pos++;
      line++;
      lineStart = pos;
      bol = true;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      pos++;
      continue;
    }
    const col = pos - lineStart;
    const startLine = line;
    if (c === '-' && source[pos + 1] === '-') {
      while (pos < len && source[pos] !== '\n') {
        pos++;
      }
      continue;
    }
    if (c === '/' && source[pos + 1] === '-') {
      const isDoc = source[pos + 2] === '-' && source[pos + 3] !== '/';
      const start = pos;
      let depth = 0;
      while (pos < len) {
        if (source[pos] === '/' && source[pos + 1] === '-') {
          depth++;
          pos += 2;
        } else if (source[pos] === '-' && source[pos + 1] === '/') {
          depth--;
          pos += 2;
          if (depth === 0) {
            break;
          }
        } else {
          if (source[pos] === '\n') {
            line++;
            lineStart = pos + 1;
          }
          pos++;
        }
      }
      if (isDoc) {
        const wasBol: boolean = bol;
        tokens.push({ kind: 'doc', value: source.slice(start + 3, pos - 2).trim(), line: startLine, col, bol: wasBol });
        // A doc comment does not consume the line start of the declaration it documents.
        bol = wasBol || bol;
      }
      continue;
    }
    if (c === '"') {
      const start = pos;
      pos++;
      let out = '';
      while (pos < len && source[pos] !== '"') {
        if (source[pos] === '\\') {
          const esc = source[pos + 1];
          pos += 2;
          if (esc === 'n') {
            out += '\n';
          } else if (esc === 't') {
            out += '\t';
          } else if (esc === 'r') {
            out += '\r';
          } else if (esc === '0') {
            out += '\0';
          } else if (esc === 'u' && source[pos] === '{') {
            const close = source.indexOf('}', pos);
            out += String.fromCodePoint(parseInt(source.slice(pos + 1, close), 16));
            pos = close + 1;
          } else {
            out += esc;
          }
        } else {
          if (source[pos] === '\n') {
            line++;
            lineStart = pos + 1;
          }
          out += source[pos];
          pos++;
        }
      }
      if (pos >= len) {
        throw new LexError(`${startLine}:${col}: unterminated string`);
      }
      pos++;
      push('text', out, start, startLine, col);
      continue;
    }
    if (c === "'") {
      let code: number;
      if (source[pos + 1] === '\\') {
        const esc = source[pos + 2];
        code = esc === 'n' ? 10 : esc === 't' ? 9 : esc === 'r' ? 13 : esc === '0' ? 0 : esc.charCodeAt(0);
        pos += 3;
      } else {
        code = source.charCodeAt(pos + 1);
        pos += 2;
      }
      if (source[pos] !== "'") {
        throw new LexError(`${startLine}:${col}: bad character literal`);
      }
      pos++;
      push('int', String(code), pos, startLine, col);
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = pos;
      if (c === '0' && source[pos + 1] === 'x') {
        pos += 2;
        while (pos < len && /[0-9a-fA-F_]/.test(source[pos])) {
          pos++;
        }
        push('int', String(parseInt(source.slice(start + 2, pos).replaceAll('_', ''), 16) | 0), start, startLine, col);
      } else {
        while (pos < len && /[0-9_]/.test(source[pos])) {
          pos++;
        }
        push('int', source.slice(start, pos).replaceAll('_', ''), start, startLine, col);
      }
      continue;
    }
    if (c === '.' && pos + 1 < len && isIdentStart(source[pos + 1])) {
      const start = pos;
      pos++;
      while (pos < len && (isIdentPart(source[pos]) || (source[pos] === '.' && isIdentStart(source[pos + 1] ?? '')))) {
        pos++;
      }
      push('dot', source.slice(start + 1, pos), start, startLine, col);
      continue;
    }
    if (isIdentStart(c) && !(c === '_' && !isIdentPart(source[pos + 1] ?? ' '))) {
      const start = pos;
      while (pos < len && (isIdentPart(source[pos]) || (source[pos] === '.' && isIdentStart(source[pos + 1] ?? '')))) {
        pos++;
      }
      const word = source.slice(start, pos);
      if (word === 'λ') {
        push('kw', 'fun', start, startLine, col);
      } else {
        push(KEYWORDS.has(word) ? 'kw' : 'ident', word, start, startLine, col);
      }
      continue;
    }
    if (UNICODE[c]) {
      const mapped = UNICODE[c];
      pos++;
      push(mapped === 'fun' ? 'kw' : 'sym', mapped, pos, startLine, col);
      continue;
    }
    const sym = SYMBOLS.find((s) => source.startsWith(s, pos));
    if (!sym) {
      throw new LexError(`${startLine}:${col}: unexpected character ${JSON.stringify(c)}`);
    }
    pos += sym.length;
    push('sym', sym, pos, startLine, col);
  }
  tokens.push({ kind: 'eof', value: '', line, col: 0, bol: true });
  return tokens;
};
