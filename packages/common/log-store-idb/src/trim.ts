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

  const sizes = lines.map((line) => byteLengthUtf8(line));

  // Walk newest -> oldest, accumulating until next addition would exceed maxSize.
  let total = 0;
  let firstIncludedIndex = lines.length;
  for (let index = lines.length - 1; index >= 0; index--) {
    const lineBytes = sizes[index];
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

const utf8Encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined;

const byteLengthUtf8 = (value: string): number => {
  if (utf8Encoder) {
    return utf8Encoder.encode(value).length;
  }
  // Fallback: assume 1 byte per char (good enough for ASCII-heavy log lines).
  return value.length;
};
