//
// Copyright 2023 DXOS.org
//

import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import type { FlameChartNodes } from 'flame-chart-js';
import React, { FC, useMemo, useState } from 'react';

// Deliberately not using the common components export to aid in code-splitting.
import { State } from './types';
import { FlameChart } from '../../../components/FlameChart';

export const TraceView: FC<{ state: State; resourceId?: number }> = ({ state, resourceId }) => {
  const [selectedFlameIndex, setSelectedFlameIndex] = useState(0);

  const selectedResource = resourceId !== undefined ? state.resources.get(resourceId) : undefined;

  const handleBack = () => {
    setSelectedFlameIndex((idx) => Math.max(0, idx - 1));
  };

  const handleForward = () => {
    setSelectedFlameIndex((idx) => Math.min(graphs.length - 1, idx + 1));
  };

  const graphs = useMemo(() => {
    const spans =
      resourceId === undefined
        ? [...state.spans.values()].filter((s) => s.parentId === undefined)
        : selectedResource?.spans ?? [];

    return buildMultiFlameGraph(
      state,
      spans.map((s) => s.id),
    );
  }, [selectedResource, state.spans.size]);

  const flameGraph = graphs[Math.min(selectedFlameIndex, graphs.length - 1)];

  return (
    <div className='h-full'>
      <div className='flex items-center p-2'>
        <ArrowLeft className='cursor-pointer' onClick={handleBack} />
        <div className='flex-1 text-center'>
          Thread {selectedFlameIndex + 1} / {graphs.length}
        </div>
        <ArrowRight className='cursor-pointer' onClick={handleForward} />
      </div>

      <div className='h-full'>{flameGraph && <FlameChart className='h-full' data={flameGraph} />}</div>
    </div>
  );
};

const SANITIZE_REGEX = /[^_](\d+)$/;

const sanitizeClassName = (className: string) => {
  const m = className.match(SANITIZE_REGEX);
  if (!m) {
    return className;
  } else {
    return className.slice(0, -m[1].length);
  }
};

const buildFlameGraph = (state: State, rootId: number): FlameChartNodes => {
  const span = state.spans.get(rootId);
  if (!span) {
    return [];
  }

  // TODO(burdon): Sort resources by names.
  const childSpans = [...state.spans.values()].filter((s) => s.parentId === span.id);
  const resource = span.resourceId !== undefined ? state.resources.get(span.resourceId)?.resource : undefined;
  const name = resource
    ? `${sanitizeClassName(resource.className)}#${resource.instanceId}.${span.methodName}`
    : span.methodName;

  const duration = span.endTs !== undefined ? +span.endTs - +span.startTs : undefined;
  const children = childSpans.flatMap((s) => buildFlameGraph(state, s.id));

  const visualDuration =
    duration ?? (children.at(-1)?.duration ? children.at(-1)!.start + children.at(-1)!.duration : 10);

  return [
    {
      name,
      start: +span.startTs,
      duration: visualDuration,
      children,
    },
  ];
};

const buildMultiFlameGraph = (state: State, roots: number[]): FlameChartNodes[] => {
  const endTimes: number[] = [];
  const graphs: FlameChartNodes[] = [];

  for (const rootId of roots) {
    const nodes = buildFlameGraph(state, rootId);
    const startTime = nodes[0].start;

    let found = false;
    for (const idx in endTimes) {
      if (endTimes[idx] <= startTime) {
        endTimes[idx] = nodes[0].start + nodes[0].duration;
        graphs[idx].push(nodes[0]);
        found = true;
        break;
      }
    }

    if (!found) {
      endTimes.push(nodes[0].start + nodes[0].duration);
      graphs.push(nodes);
    }
  }

  return graphs;
};
