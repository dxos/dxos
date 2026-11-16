//
// Copyright 2026 DXOS.org
//

import { appendFileSync, existsSync, readFileSync, truncateSync, writeFileSync } from 'node:fs';

/** A DiscordChatExporter author record (the fields readers rely on). */
export type ExportAuthor = {
  readonly id: string;
  readonly name?: string;
  readonly nickname?: string;
  readonly isBot?: boolean;
};

/** A DiscordChatExporter message record (the fields readers rely on). */
export type ExportMessage = {
  readonly id: string;
  readonly type?: string;
  readonly timestamp?: string;
  readonly content?: string;
  readonly author: ExportAuthor;
  readonly reference?: { readonly messageId?: string | null };
};

/** What an export file says about where its messages come from. */
export type ExportHeader = {
  readonly guild?: { readonly id?: string; readonly name?: string };
  readonly channel: { readonly id: string; readonly name?: string };
};

/** One channel's export: its header and its messages, oldest first. */
export type ExportFile = ExportHeader & { readonly messages: readonly ExportMessage[] };

/** File extensions of the two layouts: DiscordChatExporter's one JSON document, and this exporter's JSON lines. */
export const isExportFile = (name: string): boolean => name.endsWith('.jsonl') || name.endsWith('.json');

/**
 * Reads an export file in either layout. A `.jsonl` file is a header line followed by one message per line, appended a
 * page at a time; a last line without its newline is a write the exporter did not finish, and is ignored.
 */
export const readExportFile = (path: string): ExportFile => {
  const text = readFileSync(path, 'utf8');
  if (!path.endsWith('.jsonl')) {
    return JSON.parse(text);
  }
  const lines = completeLines(text);
  const [header, ...messages] = lines.map((line) => JSON.parse(line));
  return { ...header, messages };
};

/** The newline-terminated lines of `text`, dropping a trailing partial one. */
const completeLines = (text: string): string[] => {
  const end = text.lastIndexOf('\n');
  return end < 0
    ? []
    : text
        .slice(0, end)
        .split('\n')
        .filter((line) => line.length > 0);
};

/**
 * The id of the last message a `.jsonl` export committed, or `undefined` when it holds none, so a restarted export
 * continues after it. A torn last line is cut off here, so the next append starts on a clean line.
 */
export const resumeFrom = (path: string): string | undefined => {
  if (!existsSync(path)) {
    return undefined;
  }
  const text = readFileSync(path, 'utf8');
  const committed = text.lastIndexOf('\n') + 1;
  if (committed < text.length) {
    truncateSync(path, Buffer.byteLength(text.slice(0, committed)));
  }
  const lines = completeLines(text);
  // The first line is the header.
  if (lines.length < 2) {
    return undefined;
  }
  const last: ExportMessage = JSON.parse(lines[lines.length - 1]);
  return last.id;
};

/** Appends one page of messages, writing the header first when the file is new; one write per page. */
export const appendPage = (path: string, header: () => unknown, messages: readonly unknown[]): void => {
  if (messages.length === 0) {
    return;
  }
  if (!existsSync(path)) {
    writeFileSync(path, `${JSON.stringify(header())}\n`);
  }
  appendFileSync(path, messages.map((message) => `${JSON.stringify(message)}\n`).join(''));
};
