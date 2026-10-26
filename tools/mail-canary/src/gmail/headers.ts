//
// Copyright 2026 DXOS.org
//

/** Reads one header's value (first occurrence, unfolded) from an RFC 5322 message, or undefined. */
export const readHeader = (message: string, name: string): string | undefined => {
  const { headerLines } = splitMessage(message);
  const header = groupHeaders(headerLines).find((lines) => headerName(lines[0]) === name.toLowerCase());
  if (!header) {
    return undefined;
  }
  const [first, ...rest] = header;
  return [first.slice(first.indexOf(':') + 1), ...rest].map((line) => line.trim()).join(' ');
};

/**
 * Drops the named headers (every occurrence, folded lines included) and puts `add` first, leaving the
 * other headers, the line endings and the body byte for byte.
 */
export const rewriteHeaders = (
  message: string,
  { drop = [], add = [] }: { drop?: readonly string[]; add?: readonly string[] },
): string => {
  const { headerLines, separator, body, newline } = splitMessage(message);
  const dropped = new Set(drop.map((name) => name.toLowerCase()));
  const kept = groupHeaders(headerLines).filter((header) => !dropped.has(headerName(header[0])));
  return [...add, ...kept.flat()].join(newline) + separator + body;
};

type SplitMessage = { headerLines: string[]; separator: string; body: string; newline: string };

const splitMessage = (message: string): SplitMessage => {
  const newline = message.includes('\r\n') ? '\r\n' : '\n';
  const separator = newline + newline;
  const index = message.indexOf(separator);
  const head = index === -1 ? message : message.slice(0, index);
  const body = index === -1 ? '' : message.slice(index + separator.length);
  return { headerLines: head.split(newline), separator, body, newline };
};

/** Groups physical lines into headers, keeping each folded continuation line with its header. */
const groupHeaders = (lines: string[]): string[][] =>
  lines.reduce<string[][]>((headers, line) => {
    const isContinuation = (line.startsWith(' ') || line.startsWith('\t')) && headers.length > 0;
    if (isContinuation) {
      headers[headers.length - 1].push(line);
    } else if (line.length > 0) {
      headers.push([line]);
    }
    return headers;
  }, []);

const headerName = (line: string): string =>
  line
    .slice(0, Math.max(0, line.indexOf(':')))
    .trim()
    .toLowerCase();
