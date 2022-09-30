//
// Copyright 2022 DXOS.org
//

import flatten from 'lodash.flatten';
import zip from 'lodash.zip';
import * as os from 'os';
import prettier from 'prettier';

const force = (a: Function | any) => (typeof a === 'function' ? a() : a);
const join = (a: any[] | any) => (Array.isArray(a) ? a.join(os.EOL) : a);
const squelch = (a: any) => (!a ? '' : a);
const trim = (a: string) => a.trim();
const newline = (a: string) =>
  a[a.length - 1] === os.EOL[os.EOL.length - 1] ? a : a + os.EOL;

export const textUntrimmed = (literals: TemplateStringsArray, ...args: any[]) => {
  const cleanArgs = args.map((a) => squelch(join(squelch(force(a)))));
  return newline(trim(flatten(zip(literals, cleanArgs)).join('')));
};

export const text = (literals: TemplateStringsArray, ...args: any[]) => trim(newline(textUntrimmed(literals, ...args)));

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
