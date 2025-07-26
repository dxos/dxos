//
// Copyright 2025 DXOS.org
//

/**
 * Capitalizes the first letter of a string.
 */
export const capitalize = (str: string): string => {
  if (str.length === 0) {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Remove leading space from multi-line strings.
 */
export const trim = (strings: TemplateStringsArray, ...values: any[]) => {
  const full = String.raw(strings, ...values);
  const lines = full.replace(/^\n/, '').split('\n');
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)![0].length));
  return lines.map((l) => l.slice(indent)).join('\n');
};
