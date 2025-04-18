//
// Copyright 2023 DXOS.org
//

import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import type { FlameChartNodes } from 'flame-chart-js';
import React, { type FC, useMemo, useState } from 'react';

import { Input } from '@dxos/react-ui';

// Deliberately not using the common components export to aid in code-splitting.

import { type State } from './types';
import { FlameChart } from '../../../components/FlameChart';

export const TraceView: FC<{
  state: State;
  resourceId?: number;
  live?: boolean;
  onLiveChanged?: (live: boolean) => void;
}> = ({ state, resourceId, live, onLiveChanged }) => {
  const [selectedFlameIndex, setSelectedFlameIndex] = useState(0);
  const [showThreads, setShowThreads] = useState(true);
  const [groupByResource, setGroupByResource] = useState(true);

  const selectedResource = resourceId !== undefined ? state.resources.get(resourceId) : undefined;

  const handleBack = () => {
    setSelectedFlameIndex((idx) => Math.max(0, idx - 1));
  };

  const handleForward = () => {
    setSelectedFlameIndex((idx) => Math.min(graphs.length - 1, idx + 1));
  };

  const graphs = useMemo(() => {
    let spans =
      resourceId === undefined
        ? [...state.spans.values()].filter((s) => s.parentId === undefined)
        : selectedResource?.spans ?? [];

    if (!groupByResource) {
      // Group all spans by resource
      const resourceSpans = new Map<number | undefined, typeof spans>();
      for (const span of state.spans.values()) {
        const resId = span.resourceId;
        if (!resourceSpans.has(resId)) {
          resourceSpans.set(resId, []);
        }
        resourceSpans.get(resId)!.push(span);
      }

      // Create root nodes for each resource group
      spans = Array.from(resourceSpans.entries()).map(([resId, spans]) => {
        const resource = resId !== undefined ? state.resources.get(resId)?.resource : undefined;
        const minStart = Math.min(...spans.map((s) => +s.startTs));
        const maxEnd = Math.max(...spans.map((s) => +(s.endTs ?? s.startTs)));
        return {
          id: spans[0].id,
          startTs: minStart.toString(),
          endTs: maxEnd.toString(),
          methodName: resource ? `${sanitizeClassName(resource.className)}#${resource.instanceId}` : 'Unknown Resource',
          resourceId: resId,
          parentId: undefined,
        };
      });
    }

    const rootIds = spans.map((s) => s.id);
    return showThreads ? buildMultiFlameGraph(state, rootIds) : [rootIds.flatMap((id) => buildFlameGraph(state, id))];
  }, [selectedResource, state.spans.size, showThreads, groupByResource]);

  const flameGraph = graphs[Math.min(selectedFlameIndex, graphs.length - 1)];

  return (
    <div className='h-full'>
      <div className='flex items-center p-2'>
        <div className='flex items-center gap-2'>
          <Input.Root>
            <Input.Label>Separate Threads</Input.Label>
            <Input.Checkbox checked={showThreads} onCheckedChange={(showThreads) => setShowThreads(!!showThreads)} />
          </Input.Root>
          <Input.Root>
            <Input.Label>Group by Resource</Input.Label>
            <Input.Checkbox
              checked={groupByResource}
              onCheckedChange={(groupByResource) => setGroupByResource(!!groupByResource)}
            />
          </Input.Root>
          <Input.Root>
            <Input.Label>Live</Input.Label>
            <Input.Checkbox checked={live} onCheckedChange={(live) => onLiveChanged?.(!!live)} />
          </Input.Root>
        </div>
        {showThreads && graphs.length > 1 && (
          <>
            <ArrowLeft className='cursor-pointer ml-4' onClick={handleBack} />
            <div className='flex-1 text-center'>
              Thread {selectedFlameIndex + 1} / {graphs.length}
            </div>
            <ArrowRight className='cursor-pointer' onClick={handleForward} />
          </>
        )}
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

/**
 * Organizes trace data into multiple flame charts by distributing root spans across different threads/tracks.
 * This function is used to visualize concurrent or parallel execution spans in a way that minimizes
 * visual overlap and maximizes readability.
 *
 * The function implements a simple scheduling algorithm:
 * 1. For each root span, it tries to find an existing thread/track where it can fit
 *    (i.e., where the start time is after the end time of all spans in that track)
 * 2. If no existing track can accommodate the span, a new track is created
 *
 * This approach ensures that:
 * - Temporally overlapping spans are displayed in different tracks
 * - The number of tracks is minimized while maintaining clear visualization
 * - The temporal relationship between spans is preserved
 *
 * @param {State} state - The current tracing state containing all spans and resources
 * @param {number[]} roots - Array of root span IDs to be organized into flame charts
 * @returns {FlameChartNodes[]} An array of flame chart data structures, where each element
 *                             represents a separate track/thread of execution. Each track
 *                             contains non-overlapping spans in temporal order.
 *
 * @example
 * // Example state with two root spans that overlap in time
 * const state = {
 *   spans: new Map([
 *     [1, { id: 1, startTs: 0, endTs: 100, methodName: 'root1' }],
 *     [2, { id: 2, startTs: 50, endTs: 150, methodName: 'root2' }]
 *   ])
 * };
 * const roots = [1, 2];
 * const result = buildMultiFlameGraph(state, roots);
 * // Returns two separate tracks since the spans overlap
 * // result[0] = [{ name: 'root1', start: 0, duration: 100 }]
 * // result[1] = [{ name: 'root2', start: 50, duration: 100 }]
 */
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
