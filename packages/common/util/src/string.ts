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
export function trim(strings: TemplateStringsArray, ...values: any[]) {
  // First, build the raw result with relative indentation.
  const raw = strings.reduce((out, str, i) => {
    out += str;
    if (i < values.length) {
      const match = str.match(/(^|\n)([ \t]*)$/);
      const baseIndent = match ? match[2] : '';
      const val = String(values[i]).replace(/\r?\n/g, '\n' + baseIndent);
      out += val;
    }
    return out;
  }, '');

  // Split into lines and trim leading/trailing blank lines.
  const lines = raw.split('\n');

  while (lines.length && !lines[0].trim()) lines.shift();
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();

  // Find smallest indent across all non-blank lines.
  const minIndent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)?.[0].length ?? 0));

  // Remove that indent from all lines.
  return lines.map((l) => l.slice(minIndent)).join('\n');
}

// From https://stackoverflow.com/a/67243723/2804332
/**
 * Converts a string to kebab case.
 */
export const kebabize = (str: string) =>
  str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? '-' : '') + $.toLowerCase());
