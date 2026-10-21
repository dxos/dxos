//
// Copyright 2026 DXOS.org
//

/** A string literal; bare symbols are plain JS strings. */
export class Str {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

export type Sexp = number | string | Str | Sexp[];

/** Parses every top-level form in canonical Core S-expression text. */
export const readAll = (text: string): Sexp[] => {
  const forms: Sexp[] = [];
  const stack: Sexp[][] = [];
  let pos = 0;
  const len = text.length;
  const push = (value: Sexp) => {
    if (stack.length === 0) {
      forms.push(value);
    } else {
      stack[stack.length - 1].push(value);
    }
  };
  while (pos < len) {
    const code = text.charCodeAt(pos);
    if (code === 32 || code === 10 || code === 9 || code === 13) {
      pos++;
    } else if (code === 59) {
      // `;` comment to end of line.
      while (pos < len && text.charCodeAt(pos) !== 10) {
        pos++;
      }
    } else if (code === 40) {
      stack.push([]);
      pos++;
    } else if (code === 41) {
      const list = stack.pop();
      if (!list) {
        throw new Error(`sexp: unbalanced ')' at ${pos}`);
      }
      push(list);
      pos++;
    } else if (code === 34) {
      pos++;
      let out = '';
      let start = pos;
      while (true) {
        if (pos >= len) {
          throw new Error('sexp: unterminated string');
        }
        const ch = text.charCodeAt(pos);
        if (ch === 34) {
          out += text.slice(start, pos);
          pos++;
          break;
        }
        if (ch === 92) {
          out += text.slice(start, pos);
          const esc = text[pos + 1];
          pos += 2;
          switch (esc) {
            case 'n':
              out += '\n';
              break;
            case 't':
              out += '\t';
              break;
            case 'r':
              out += '\r';
              break;
            case 'u':
              out += String.fromCharCode(parseInt(text.slice(pos, pos + 4), 16));
              pos += 4;
              break;
            default:
              out += esc;
          }
          start = pos;
        } else {
          pos++;
        }
      }
      push(new Str(out));
    } else {
      const start = pos;
      while (pos < len) {
        const ch = text.charCodeAt(pos);
        if (ch === 32 || ch === 10 || ch === 9 || ch === 13 || ch === 40 || ch === 41) {
          break;
        }
        pos++;
      }
      const atom = text.slice(start, pos);
      push(/^-?[0-9]+$/.test(atom) ? Number(atom) | 0 : atom);
    }
  }
  if (stack.length > 0) {
    throw new Error('sexp: unbalanced (');
  }
  return forms;
};

/** Escapes a string literal exactly as the DEUS printer does (canonical form). */
export const quote = (value: string): string => {
  let out = '"';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 34) {
      out += '\\"';
    } else if (code === 92) {
      out += '\\\\';
    } else if (code === 10) {
      out += '\\n';
    } else if (code === 9) {
      out += '\\t';
    } else if (code === 13) {
      out += '\\r';
    } else if (code < 32 || code === 127) {
      out += '\\u' + code.toString(16).padStart(4, '0');
    } else {
      out += value[i];
    }
  }
  return out + '"';
};

/** Prints a form canonically: single spaces, no trailing whitespace. */
export const print = (form: Sexp): string => {
  if (typeof form === 'number') {
    return String(form);
  }
  if (typeof form === 'string') {
    return form;
  }
  if (form instanceof Str) {
    return quote(form.value);
  }
  return '(' + form.map(print).join(' ') + ')';
};
