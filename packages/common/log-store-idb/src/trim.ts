//
// Copyright 2026 DXOS.org
//

/**
 * Trim a list of pre-encoded JSONL lines so the joined output (with `\n` separators)
 * fits within `maxSize` bytes (UTF-8). The newest lines (end of array) are preferred —
 * lines are dropped from the start. Never cuts inside a line.
 *
 * Returns the trimmed JSONL string (no trailing newline).
 */
export const trimJsonlToSize = (lines: readonly string[], maxSize: number): string => {
  if (lines.length === 0 || maxSize <= 0) {
    return '';
  }

  // Walk newest -> oldest, accumulating until the next addition would exceed maxSize.
  // Lines are measured on the way so a small cap never measures the whole history.
  let total = 0;
  let firstIncludedIndex = lines.length;
  for (let index = lines.length - 1; index >= 0; index--) {
    const lineBytes = byteLengthUtf8(lines[index]!);
    const sepBytes = total === 0 ? 0 : 1;
    if (total + lineBytes + sepBytes > maxSize) {
      break;
    }
    total += lineBytes + sepBytes;
    firstIncludedIndex = index;
  }

  if (firstIncludedIndex >= lines.length) {
    return '';
  }
  return lines.slice(firstIncludedIndex).join('\n');
};

/**
 * UTF-8 byte length of a string, counted without encoding it.
 *
 * `TextEncoder.encode(value).length` allocates twice — the binding copies the string into
 * its own heap, then allocates the output array — and both die on the next line. Callers
 * measure megabytes at a time, so the count runs in JS instead.
 */
export const byteLengthUtf8 = (value: string): number => {
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        bytes += 4;
        index++;
      } else {
        bytes += 3; // Unpaired high surrogate; TextEncoder substitutes U+FFFD.
      }
    } else {
      bytes += 3; // Includes a trailing or unpaired surrogate, also U+FFFD.
    }
  }
  return bytes;
};
