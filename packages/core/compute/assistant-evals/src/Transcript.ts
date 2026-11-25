//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { AiUsage } from '@dxos/ai';

/**
 * Where a run's transcripts land: one folder per process, so a later run never overwrites an
 * earlier one. Untracked (the package's `.gitignore`), since transcripts carry whole prompts.
 */
export const DIRECTORY = resolve(
  import.meta.dirname,
  '../.artifacts/transcripts',
  new Date().toISOString().replace(/[:.]/g, '-'),
);

/** One message of a prompt or response, as `AiTelemetry` serializes it. */
type Message = { role?: string; content?: string | Part[] };

type Part = {
  type?: string;
  text?: string;
  name?: string;
  result?: unknown;
  function?: { name?: string; arguments?: unknown };
};

const isMessages = (value: unknown): value is Message[] =>
  Array.isArray(value) && value.every((message) => typeof message === 'object' && message !== null);

/** A fence long enough that no run of backticks inside `body` closes it. */
const fence = (body: string, language = ''): string => {
  const longest = Math.max(2, ...[...body.matchAll(/`+/g)].map(([run]) => run.length));
  const ticks = '`'.repeat(longest + 1);
  return `${ticks}${language}\n${body.replace(/\n$/, '')}\n${ticks}`;
};

const json = (value: unknown): string => JSON.stringify(value, null, 2) ?? String(value);

/** A tool call's arguments: a program reads best as code, anything else as JSON. */
const renderArguments = (args: unknown): string => {
  const parsed = typeof args === 'string' ? tryParse(args) : args;
  if (typeof parsed === 'object' && parsed !== null && 'code' in parsed && typeof parsed.code === 'string') {
    const { code, ...rest } = parsed;
    return [fence(code, 'ts'), ...(Object.keys(rest).length > 0 ? [fence(json(rest), 'json')] : [])].join('\n\n');
  }
  return fence(typeof parsed === 'string' ? parsed : json(parsed), typeof parsed === 'string' ? 'text' : 'json');
};

const tryParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const renderPart = (part: Part): string => {
  switch (part.type) {
    case 'text':
      return part.text ?? '';
    case 'reasoning':
      return `<details><summary>Reasoning</summary>\n\n${fence(part.text ?? '', 'text')}\n\n</details>`;
    case 'function':
      return `**Tool call** \`${part.function?.name}\`\n\n${renderArguments(part.function?.arguments)}`;
    case 'tool-result': {
      const result = typeof part.result === 'string' ? tryParse(part.result) : part.result;
      const body = typeof result === 'string' ? fence(result, 'text') : fence(json(result), 'json');
      return `**Tool result** \`${part.name}\`\n\n${body}`;
    }
    default:
      return fence(json(part), 'json');
  }
};

const renderMessage = (message: Message): string => {
  const body =
    typeof message.content === 'string'
      ? message.content
      : (message.content ?? [])
          .map(renderPart)
          .filter((text) => text.length > 0)
          .join('\n\n');
  return `### ${message.role ?? 'unknown'}\n\n${body}`;
};

const seconds = (millis: number): string => `${(millis / 1_000).toFixed(1)}s`;

const costOf = (call: AiUsage.Call): number | undefined => {
  const pricing = call.modelId ? AiUsage.pricingOf(call.modelId) : undefined;
  return pricing ? AiUsage.cost(call, pricing) : undefined;
};

const usd = (value: number | undefined): string => (value === undefined ? '—' : `$${value.toFixed(4)}`);

/** What the run ended with: the agent's output, or the error that ended it. */
export type Outcome = { readonly output: unknown } | { readonly error: unknown };

/**
 * The run as Markdown: model metadata per call, the system prompt, the tools offered, then each
 * model call's new input and its response, in order. Built from the calls `AiUsage` recorded, since
 * those carry exactly what the model was sent, system prompt included.
 */
export const render = ({
  name,
  calls,
  outcome,
}: {
  name: string;
  calls: readonly AiUsage.Call[];
  outcome: Outcome;
}): string => {
  const start = calls[0]?.start ?? 0;
  const end = calls.at(-1)?.end ?? start;
  const total = (key: 'inputTokens' | 'outputTokens' | 'cacheReadTokens' | 'cacheWriteTokens') =>
    calls.reduce((sum, call) => sum + call[key], 0);
  const costs = calls.map(costOf);
  const cost = costs.every((value) => value !== undefined)
    ? costs.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : undefined;
  const models = [...new Set(calls.map((call) => `${call.model}${call.provider ? ` (${call.provider})` : ''}`))];

  const sections: string[] = [
    `# ${name}`,
    [
      `- **Models:** ${models.join(', ') || '—'}`,
      `- **Model calls:** ${calls.length}`,
      `- **Model time:** ${seconds(end - start)}`,
      `- **Tokens:** ${total('inputTokens')} in, ${total('outputTokens')} out, ` +
        `${total('cacheReadTokens')} cache read, ${total('cacheWriteTokens')} cache write`,
      `- **Cost:** ${usd(cost)}`,
    ].join('\n'),
    '## Model calls',
    [
      '| # | Model | Stage | Start | Duration | In | Out | Cache read | Cache write | Cost | Parameters |',
      '| - | ----- | ----- | ----- | -------- | -- | --- | ---------- | ----------- | ---- | ---------- |',
      ...calls.map(
        (call, index) =>
          `| ${index + 1} | ${call.model} | ${call.stage ?? '—'} | +${seconds(call.start - start)} | ` +
          `${seconds(call.end - call.start)} | ${call.inputTokens} | ${call.outputTokens} | ${call.cacheReadTokens} | ` +
          `${call.cacheWriteTokens} | ${usd(costOf(call))} | ${call.parameters ? `\`${JSON.stringify(call.parameters)}\`` : '—'} |`,
      ),
    ].join('\n'),
  ];

  // The system prompt can change between calls (a skill loaded mid-run); each distinct one is shown once.
  const systemPrompts = [
    ...new Set(
      calls.flatMap((call) =>
        isMessages(call.input)
          ? call.input.filter((message) => message.role === 'system').map((message) => renderMessage(message))
          : [],
      ),
    ),
  ];
  sections.push(
    '## System prompt',
    systemPrompts.length > 0
      ? systemPrompts
          .map((prompt, index) =>
            fence(prompt.replace(/^### system\n\n/, ''), 'markdown').replace(
              /^/,
              systemPrompts.length > 1 ? `Version ${index + 1}:\n\n` : '',
            ),
          )
          .join('\n\n')
      : '_Not recorded._',
  );

  const tools = [
    ...new Set(
      calls.flatMap((call) =>
        Array.isArray(call.tools) ? call.tools.map((tool: { name?: unknown }) => String(tool?.name ?? json(tool))) : [],
      ),
    ),
  ];
  sections.push('## Tools', tools.length > 0 ? tools.map((tool) => `- \`${tool}\``).join('\n') : '_None._');

  // Each call's input repeats the whole history: only what is new since the previous call is shown.
  let seen = 0;
  calls.forEach((call, index) => {
    sections.push(
      `## Call ${index + 1} — ${call.model}, ${seconds(call.end - call.start)}, ` +
        `${call.inputTokens + call.cacheReadTokens + call.cacheWriteTokens} in / ${call.outputTokens} out`,
    );
    if (isMessages(call.input)) {
      const fresh = call.input.slice(seen).filter((message) => message.role !== 'system');
      seen = call.input.length + 1;
      sections.push(...fresh.map(renderMessage));
    } else if (call.input !== undefined) {
      sections.push(
        `_The prompt was over the telemetry's size cap and arrived cut off; it is shown raw._\n\n` +
          fence(String(call.input).slice(-4_000), 'text'),
      );
    }
    if (isMessages(call.output)) {
      sections.push(...call.output.map(renderMessage));
    }
  });

  sections.push(
    '## Outcome',
    'error' in outcome
      ? fence(
          outcome.error instanceof Error ? (outcome.error.stack ?? outcome.error.message) : String(outcome.error),
          'text',
        )
      : fence(
          typeof outcome.output === 'string' ? outcome.output : json(outcome.output),
          typeof outcome.output === 'string' ? 'markdown' : 'json',
        ),
  );

  return `${sections.join('\n\n')}\n`;
};

/** A file name from a test name: readable, and safe on every file system. */
const slug = (name: string): string =>
  name
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160) || 'run';

/** Writes the run's transcript under {@link DIRECTORY} and returns its path. */
export const write = async (options: Parameters<typeof render>[0]): Promise<string> => {
  const path = join(DIRECTORY, `${slug(options.name)}.md`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, render(options));
  return path;
};
