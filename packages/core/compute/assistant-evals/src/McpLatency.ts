//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/** One timed round trip: the client-observed wall clock of a single MCP request. */
export type Sample = {
  readonly tool: string;
  /** What the sample is grouped under — the tool, or `invokeOperation:<key>` for an operation. */
  readonly label: string;
  readonly millis: number;
  readonly isError: boolean;
};

/** What a set of samples for one tool came to. */
export type Stats = {
  readonly count: number;
  readonly errors: number;
  readonly min: number;
  readonly mean: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
};

export type Report = {
  readonly target: string;
  readonly url: string;
  /** Time to `initialize` plus the first `tools/list`, which no per-tool figure should carry. */
  readonly connectMillis: number;
  readonly samples: readonly Sample[];
  /** Per label — one row per tool, and one per operation behind `invokeOperation` — plus `*`. */
  readonly stats: Record<string, Stats>;
};

/** One request to time: the tool and the arguments it is called with. */
export type Probe = {
  readonly tool: string;
  readonly args?: Record<string, unknown>;
  /**
   * Overrides the row this probe's samples are grouped under.
   *
   * Rarely needed: `invokeOperation` is keyed by the operation it invokes automatically, which is
   * the breakdown that matters — every operation goes through the one tool, so a per-tool figure
   * for it is an average over verbs that have nothing in common.
   */
  readonly label?: string;
};

/** `invokeOperation` dispatches by `key`, so the operation is what a row must be named after. */
const labelOf = ({ tool, args, label }: Probe): string => {
  if (label != null) {
    return label;
  }
  const key = args?.key;
  return tool === 'invokeOperation' && typeof key === 'string' ? `${tool}:${key}` : tool;
};

export type ProbeOptions = {
  readonly target: string;
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly probes: readonly Probe[];
  /** Timed repetitions per probe. */
  readonly iterations?: number;
  /**
   * Untimed repetitions run first.
   *
   * The first call of a run pays for a cold isolate and a warm-up of whatever the worker lazily
   * builds, which is real but is not the latency of a tool call — a run that folded it in would
   * report a p95 set by the sample count rather than by the surface.
   */
  readonly warmup?: number;
};

const DEFAULT_ITERATIONS = 5;
const DEFAULT_WARMUP = 1;

/** Nearest-rank, because a run is a handful of samples and interpolation would invent values. */
const percentile = (sorted: readonly number[], fraction: number): number =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1)];

const round = (value: number): number => Math.round(value * 10) / 10;

export const stats = (samples: readonly Sample[]): Stats => {
  const millis = samples.map((sample) => sample.millis).sort((left, right) => left - right);
  const total = millis.reduce((sum, value) => sum + value, 0);
  return {
    count: samples.length,
    errors: samples.filter((sample) => sample.isError).length,
    min: round(millis[0] ?? 0),
    mean: round(millis.length === 0 ? 0 : total / millis.length),
    p50: round(percentile(millis, 0.5)),
    p95: round(percentile(millis, 0.95)),
    max: round(millis[millis.length - 1] ?? 0),
  };
};

const summarize = (samples: readonly Sample[]): Record<string, Stats> => {
  const byLabel: Record<string, Sample[]> = {};
  for (const sample of samples) {
    (byLabel[sample.label] ??= []).push(sample);
  }
  return Object.fromEntries([
    ...Object.entries(byLabel).map(([label, rows]) => [label, stats(rows)] as const),
    ['*', stats(samples)] as const,
  ]);
};

/**
 * Times the MCP surface from the outside, over the same Streamable HTTP transport a client uses.
 *
 * Client-observed rather than server-side, because that is the only figure every target can produce:
 * a deployed worker's own handling time is not visible from here, and a number measured one way for
 * `local` and another way for `prod` cannot be compared — which is the whole reason to have targets.
 *
 * One connection for the whole probe: reconnecting per call would measure the OAuth handshake and
 * TLS setup once per sample instead of once per run.
 */
export const probe = async ({
  target,
  url,
  headers,
  probes,
  iterations = DEFAULT_ITERATIONS,
  warmup = DEFAULT_WARMUP,
}: ProbeOptions): Promise<Report> => {
  const client = new Client({ name: 'dx-eval-latency', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: headers ? { headers } : undefined,
  });
  let connectMillis: number | undefined;

  const samples: Sample[] = [];
  const connectStarted = Date.now();
  try {
    // Inside the protected lifecycle, because a target that refuses the connection is exactly what
    // the report exists to show: rejecting here would leave the eval with no numbers at all.
    await client.connect(transport);
    await client.listTools();
    connectMillis = Date.now() - connectStarted;

    for (const probe of probes) {
      const { tool, args } = probe;
      const label = labelOf(probe);
      for (let index = 0; index < warmup + iterations; ++index) {
        const started = Date.now();
        let isError = false;
        try {
          const result = await client.callTool({ name: tool, arguments: args ?? {} });
          isError = result.isError === true;
        } catch {
          // A transport failure is a sample too: a target that 401s every call should show up as a
          // latency report full of errors rather than as a thrown eval with no numbers at all.
          isError = true;
        }
        if (index >= warmup) {
          samples.push({ tool, label, millis: Date.now() - started, isError });
        }
      }
    }
  } catch (error) {
    // Connect or discovery failed: one errored sample per probe, so `stats['*'].errors` is nonzero
    // and the scorer reads a failing report rather than a thrown eval.
    connectMillis ??= Date.now() - connectStarted;
    for (const probe of probes) {
      samples.push({ tool: probe.tool, label: labelOf(probe), millis: Date.now() - connectStarted, isError: true });
    }
  } finally {
    // The client may never have connected, and closing one that did not is not an error worth
    // losing the report over.
    await client.close().catch(() => {});
  }

  return { target, url, connectMillis: connectMillis ?? 0, samples, stats: summarize(samples) };
};
