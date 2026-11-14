//
// Copyright 2026 DXOS.org
//

import type * as ConfigError from 'effect/Config';
import * as Layer from 'effect/Layer';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { type AiService } from '@dxos/ai';
import * as AiMetering from '@dxos/compute/AiMetering';
import * as Trace from '@dxos/compute/Trace';

export type Metering = {
  /** The AI layer with every model call written to the trace. */
  readonly layer: Layer.Layer<AiService.AiService, ConfigError.ConfigError>;
  /** This run's trace events, flattened. */
  readonly events: () => Trace.FlatEvent[];
};

/**
 * Meters `ai` for a crawl run: each model call becomes a `Trace.ModelCall` event, kept in memory for the
 * run's report and appended as a JSON line to `logPath`, which accumulates across runs so their cost can be
 * queried later.
 */
export const meter = (ai: Layer.Layer<AiService.AiService, ConfigError.ConfigError>, logPath?: string): Metering => {
  const messages: Trace.Message[] = [];
  if (logPath) {
    mkdirSync(dirname(logPath), { recursive: true });
  }
  const sink: Trace.Sink = {
    write: (message) => {
      messages.push(message);
      if (logPath) {
        const { meta, isEphemeral, events } = message;
        appendFileSync(logPath, `${JSON.stringify({ meta, isEphemeral, events })}\n`);
      }
    },
  };
  const trace = Trace.testTraceService({ meta: { processName: 'discord-crawl' } }).pipe(
    Layer.provide(Layer.succeed(Trace.TraceSink, sink)),
  );
  return {
    layer: AiMetering.metered.pipe(Layer.provide(Layer.merge(ai, trace))),
    events: () => messages.flatMap(Trace.flatten),
  };
};

const usd = (value: number | undefined): string => (value === undefined ? 'n/a' : `$${value.toFixed(4)}`);
const count = (value: number): string => value.toLocaleString('en-US');

/** A table of the run's model calls by stage and model, at catalog list prices, with the cost per 1,000 messages. */
export const costReport = (events: Iterable<Trace.Event>, messages: number): string[] => {
  const totals = AiMetering.summarize(events).sort((left, right) => (right.cost ?? 0) - (left.cost ?? 0));
  if (totals.length === 0) {
    return ['Cost:     no model calls'];
  }
  const rows = totals.map((total) => [
    total.stage ?? '-',
    total.model,
    count(total.calls),
    count(total.inputTokens),
    count(total.outputTokens),
    `${count(total.cacheReadTokens)}/${count(total.cacheWriteTokens)}`,
    usd(total.cost),
  ]);
  const priced = totals.filter((total) => total.cost !== undefined);
  const sum = priced.reduce((acc, total) => acc + (total.cost ?? 0), 0);
  const header = ['stage', 'model', 'calls', 'input', 'output', 'cache r/w', 'USD'];
  const widths = header.map((title, column) => Math.max(title.length, ...rows.map((row) => row[column].length)));
  const line = (cells: readonly string[]) =>
    `  ${cells.map((cell, column) => (column < 2 ? cell.padEnd(widths[column]) : cell.padStart(widths[column]))).join('  ')}`;
  const unpriced = totals.length - priced.length;
  return [
    'Cost (list prices):',
    line(header),
    ...rows.map(line),
    `  total ${usd(sum)}${unpriced > 0 ? ` (+${unpriced} unpriced row${unpriced === 1 ? '' : 's'})` : ''}` +
      (messages > 0 ? `   per 1,000 messages ${usd((sum / messages) * 1_000)}` : ''),
  ];
};
