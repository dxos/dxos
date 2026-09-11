//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type DebugProbe } from './debug-model.ts';
import { type Stat, Stats } from './Stats.tsx';
import { useDebugModel } from './useDebug.tsx';

export type DebugProps = ThemedClassName<{
  /** Readouts side by side. @default 1 */
  columns?: number;
  title?: string;
}>;

/**
 * The table over whatever probes are registered (SPEC follow-up: generic debug mechanism, built
 * once and reused by future react-ui components rather than re-invented per surface).
 *
 * Values are sampled once per animation frame while mounted — the model is not reactive over
 * values by design, so the table is the only thing paying for sixty reads a second. Grouped by the
 * probe's `group`, in fixed tracks so a changing digit moves nothing beside it.
 */
export const Debug = ({ columns = 1, title, classNames }: DebugProps) => {
  const model = useDebugModel();
  const [, bump] = useReducer((version: number) => version + 1, 0);
  useEffect(() => model?.subscribe(bump), [model]);

  const probes = model?.probes() ?? [];
  const groups = useMemo(() => {
    const map = new Map<string, DebugProbe[]>();
    for (const probe of probes) {
      const group = probe.group ?? '';
      map.set(group, [...(map.get(group) ?? []), probe]);
    }

    return map;
    // Registration bumps the reducer; the list identity follows it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, probes.length]);

  const [values, setValues] = useState<Record<string, number | string>>({});
  const frame = useRef(0);
  useEffect(() => {
    if (!model) {
      return;
    }

    const tick = () => {
      setValues(model.read());
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [model]);

  if (!model || !probes.length) {
    return null;
  }

  return (
    <div
      className={mx(
        'z-20 absolute bottom-2 right-2 p-2 rounded-md bg-base-surface/90 border border-separator w-[16rem] text-sm',
        classNames,
      )}
      data-testid='debug.panel'
    >
      {[...groups].map(([group, members]) => (
        <Stats
          key={group}
          title={group || title}
          columns={columns}
          stats={members.map(({ id, label, unit, alarm }): Stat => ({
            id,
            label: label ?? id,
            unit,
            classNames: alarm ? (value) => alarm(value) && 'text-error' : undefined,
          }))}
          values={values}
        />
      ))}
    </div>
  );
};
