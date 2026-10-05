//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Prompt from 'effect/ai/Prompt';
import * as Tool from 'effect/ai/Tool';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Obj } from '@dxos/echo';

/**
 * A run's transcript, written for replay tests (`@dxos/assistant` `prompt-cache.test.ts`): the
 * chat's messages, and per model call the system prompt and tools it was sent with. System prompts
 * and tool sets repeat call after call, so each is stored once and referenced by index.
 */
export type File = {
  readonly source: string;
  readonly model: string;
  readonly systems: readonly string[];
  readonly toolsets: readonly (readonly ToolSpec[])[];
  readonly requests: readonly { readonly system: number; readonly tools: number; readonly messages: number }[];
  readonly messages: readonly Obj.JSON[];
};

export type ToolSpec = { readonly name: string; readonly description?: string; readonly parameters: unknown };

/** What one model call was sent, apart from the history the transcript's messages reproduce. */
export type Request = {
  readonly system: string;
  readonly tools: readonly ToolSpec[];
  /** Prompt messages after the system prompt, to align the call with a prefix of the transcript. */
  readonly messages: number;
};

/** Where transcripts go; unset leaves capture off, since a request holds the whole system prompt. */
export const directory = (): string | undefined => process.env.DX_EVAL_TRANSCRIPT_DIR || undefined;

export const captureRequest = (prompt: Prompt.Prompt, tools: ReadonlyArray<Tool.Any>): Request => ({
  system: prompt.content
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n'),
  tools: tools.map((tool) => ({
    name: tool.name,
    description: Tool.getDescription(tool),
    parameters: Tool.getJsonSchema(tool),
  })),
  messages: prompt.content.filter((message) => message.role !== 'system').length,
});

/**
 * Credentials a session can print into its own transcript: a temporary Cloudflare deployment's claim
 * URL, and bearer tokens. A transcript is committed as a fixture, so they never reach the file.
 */
const SECRETS: ReadonlyArray<readonly [RegExp, string]> = [
  [/claimToken=[\w-]+/g, 'claimToken=REDACTED'],
  [/\b(Bearer\s+)[\w.~+/-]{16,}=*/gi, '$1REDACTED'],
];

export const redact = (text: string): string =>
  SECRETS.reduce((redacted, [pattern, replacement]) => redacted.replace(pattern, replacement), text);

/** Writes `<directory>/<name>.json`, interning system prompts and tool sets, with credentials redacted. */
export const write = (
  name: string,
  {
    source,
    model,
    requests,
    messages,
  }: { source: string; model: string; requests: readonly Request[]; messages: readonly Obj.JSON[] },
): string | undefined => {
  const dir = directory();
  if (!dir) {
    return undefined;
  }
  const systems: string[] = [];
  const toolsets: ToolSpec[][] = [];
  const systemIndex = new Map<string, number>();
  const toolsetIndex = new Map<string, number>();
  const intern = <T>(table: T[], index: Map<string, number>, value: T): number => {
    const key = JSON.stringify(value);
    const found = index.get(key);
    if (found !== undefined) {
      return found;
    }
    index.set(key, table.length);
    table.push(value);
    return table.length - 1;
  };
  const file: File = {
    source,
    model,
    systems,
    toolsets,
    requests: requests.map((request) => ({
      system: intern(systems, systemIndex, request.system),
      tools: intern(toolsets, toolsetIndex, [...request.tools]),
      messages: request.messages,
    })),
    messages,
  };
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.json`);
  writeFileSync(filePath, `${redact(JSON.stringify(file, null, 2))}\n`);
  return filePath;
};
