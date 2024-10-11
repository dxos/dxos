//
// Copyright 2024 DXOS.org
//

const LOW_DASH = '_'.codePointAt(0)!;
const SMALL_A = 'a'.codePointAt(0)!;
const CAPITAL_A = 'A'.codePointAt(0)!;
const SMALL_Z = 'z'.codePointAt(0)!;
const CAPITAL_Z = 'Z'.codePointAt(0)!;

const isLower = (char: number) => char >= SMALL_A && char <= SMALL_Z;

const isUpper = (char: number) => char >= CAPITAL_A && char <= CAPITAL_Z;

const toLower = (char: number) => char + 0x20;

export const decamelize = (str: string) => {
  const firstChar = str.charCodeAt(0);
  if (!isLower(firstChar)) {
    return str;
  }
  const length = str.length;
  let changed = false;
  const out: number[] = [];
  for (let i = 0; i < length; ++i) {
    const c = str.charCodeAt(i);
    if (isUpper(c)) {
      out.push(LOW_DASH);
      out.push(toLower(c));
      changed = true;
    } else {
      out.push(c);
    }
  }
  return changed ? String.fromCharCode.apply(undefined, out) : str;
};
