//
// Copyright 2026 DXOS.org
//

/** SVG is XML, so every interpolated label must be escaped — object names are arbitrary user text. */
export const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&apos;';
    }
  });

/**
 * Greedy word wrap to a character budget. SVG has no layout engine and the device gives us no font
 * metrics, so the budget is a character count calibrated to the key width rather than a measurement.
 * Overflow past the last line is ellipsised.
 */
export const wrapText = (value: string, maxChars: number, maxLines: number): string[] => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) {
      lines.push(line);
    }
    if (lines.length === maxLines) {
      break;
    }
    // A single word longer than the budget is hard-split rather than overflowing the key.
    line = word.length > maxChars ? word.slice(0, maxChars) : word;
  }
  if (line && lines.length < maxLines) {
    lines.push(line);
  }

  const truncated = lines.length < maxLines ? lines : lines.slice(0, maxLines);
  const consumed = truncated.join(' ').length;
  if (consumed < value.trim().length && truncated.length === maxLines) {
    const last = truncated[maxLines - 1];
    truncated[maxLines - 1] = `${last.slice(0, Math.max(0, maxChars - 1))}…`;
  }

  return truncated;
};
