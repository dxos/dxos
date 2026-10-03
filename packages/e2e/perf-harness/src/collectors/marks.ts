//
// Copyright 2026 DXOS.org
//

import { type Attached } from '../cdp.ts';
import { type TargetKind } from '../types.ts';

/** Duplicated from `@dxos/util`'s `WORK_MARKS_GLOBAL` for the reason `disk.ts` gives. */
const WORK_MARKS_GLOBAL = '__dxosWorkMarks';

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
  /** Realms that published the probe; `0` means nothing was instrumented, not that nothing happened. */
  realms: number;
};

const expression = (since: number) => `(() => {
  const read = globalThis['${WORK_MARKS_GLOBAL}'];
  return typeof read === 'function' ? JSON.stringify(read(${since})) : null;
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
