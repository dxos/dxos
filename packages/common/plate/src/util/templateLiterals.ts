//
// Copyright 2022 DXOS.org
//

import flatten from 'lodash.flatten';
import zip from 'lodash.zip';
import * as os from 'os';
import prettier from 'prettier';

const force = (a: Function | any) => (typeof a === 'function' ? a() : a);
const join = (a: any[] | any) => (Array.isArray(a) ? a.filter(Boolean).join(os.EOL) : a);
const squelch = (a: any) => (!a ? '' : a);
const trim = (a: string) => a.trim();
const terminalNewline = (a: string) => (a[a.length - 1] === os.EOL[os.EOL.length - 1] ? a : a + os.EOL);

const removeLeadingTabs = (literal: string, n?: number) => {
  const chars = n ?? detectParasiticTabs(literal);
  const lines = literal.split(os.EOL);
  return lines.map((l) => l.replace(new RegExp(`^\\s{${chars},${chars}}`), '')).join(os.EOL);
};

const detectParasiticTabs = (literal: string): number => {
  const lines = literal.split(os.EOL);
  const firstLine = lines[1];
  const whitespace = /^\s+/.exec(firstLine);
  const chars = whitespace ? whitespace[0].length : 0;
  return chars;
};

export const textUntrimmed = (literals: TemplateStringsArray, ...args: any[]) => {
  const tabs = detectParasiticTabs(literals[0]);
  const cleanArgs = args.map((a) => squelch(join(squelch(force(a)))));
  return terminalNewline(
    flatten(
      zip(
        literals.map((l) => removeLeadingTabs(l, tabs)),
        cleanArgs
      ).filter(Boolean)
    ).join('')
  );
};

export const text = (literals: TemplateStringsArray, ...args: any[]) =>
  trim(terminalNewline(textUntrimmed(literals, ...args)));

export const ts = (literals: TemplateStringsArray, ...args: any[]) => {
  const result = text(literals, ...args);
  try {
    return prettier.format(result, {
      parser: 'typescript'
    });
  } catch (err: any) {
    console.warn('error formatting typescript:\n', err?.message);
    return result;
  }
};
