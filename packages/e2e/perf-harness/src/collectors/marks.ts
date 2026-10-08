//
// Copyright 2026 DXOS.org
//

import { type Attached } from '../cdp.ts';
import { type TargetKind } from '../types.ts';

/** Duplicated from `@dxos/util`'s `WORK_MARK_PREFIX` for the reason `disk.ts` gives. */
const WORK_MARK_PREFIX = 'dxos:';

/** One realm's mark, labelled with the realm it was taken in. */
export type RealmMark = {
  name: string;
  /** Epoch milliseconds on the realm's high-resolution clock, comparable across realms. */
  at: number;
  detail?: string;
  kind: TargetKind;
  realm: string;
};

export type MarkReading = {
  marks: RealmMark[];
  /** Realms that have ever written a work mark; `0` means nothing was instrumented, not that nothing happened. */
  realms: number;
};

/** Reads the realm's User Timing marks directly, so a realm needs no probe beyond `markWork` itself. */
const expression = (since: number) => `(() => {
  const perf = globalThis.performance;
  if (typeof perf?.getEntriesByType !== 'function') {
    return null;
  }
  const own = perf.getEntriesByType('mark').filter((mark) => mark.name.startsWith('${WORK_MARK_PREFIX}'));
  if (own.length === 0) {
    return null;
  }
  return JSON.stringify(
    own
      .map((mark) => ({
        name: mark.name.slice(${WORK_MARK_PREFIX.length}),
        at: perf.timeOrigin + mark.startTime,
        detail: typeof mark.detail?.text === 'string' ? mark.detail.text : undefined,
      }))
      .filter((mark) => mark.at >= ${since}),
  );
})()`;

type RemoteResult = { result?: { value?: unknown } };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Every attached realm's marks at or after `since` (epoch ms), merged and ordered by time. */
export const readMarks = async (targets: Attached[], since: number): Promise<MarkReading> => {
  const marks: RealmMark[] = [];
  let realms = 0;
  for (const target of targets) {
    const response = await target.cdp.trySend<RemoteResult>(
      'Runtime.evaluate',
      { expression: expression(since), returnByValue: true },
      { timeoutMs: 10_000 },
    );
    const serialized = response?.result?.value;
    if (typeof serialized !== 'string') {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) {
      continue;
    }
    realms += 1;
    for (const mark of parsed) {
      if (isRecord(mark) && typeof mark.name === 'string' && typeof mark.at === 'number') {
        marks.push({
          name: mark.name,
          at: mark.at,
          ...(typeof mark.detail === 'string' ? { detail: mark.detail } : {}),
          kind: target.kind,
          realm: target.name,
        });
      }
    }
  }
  marks.sort((left, right) => left.at - right.at);
  return { marks, realms };
};
