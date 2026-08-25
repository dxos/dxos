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
  // A zero budget has no last line to ellipsise.
  if (maxLines <= 0) {
    return [];
  }

  const words = value.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }
  // Compared against the normalized text: measuring against the raw value would count collapsed
  // whitespace as dropped content and ellipsise a label that fits.
  const normalized = words.join(' ');

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
  // Keyed on dropped content rather than on filling every line: a single oversized word is
  // hard-split into one line, which would otherwise be cut with no ellipsis to show for it.
  if (consumed < normalized.length && truncated.length > 0) {
    const index = truncated.length - 1;
    truncated[index] = `${truncated[index].slice(0, Math.max(0, maxChars - 1))}…`;
  }

  return truncated;
};
