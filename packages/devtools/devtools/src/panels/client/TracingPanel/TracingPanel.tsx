//
// Copyright 2023 DXOS.org
//

import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { FlameChart } from '../../../components/FlameChart'; // Deliberately not using the common components export to aid in code-splitting.

import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { Resource, Span } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';

import { PanelContainer } from '../../../components';
import type { FlameChartNodes } from 'flame-chart-js';

type State = {
  resources: Map<number, Resource>;
  spans: Map<number, Span>;
};

export const TracingPanel = () => {
  const client = useClient();
  const state = useRef<State>({
    resources: new Map<number, Resource>(),
    spans: new Map<number, Span>(),
  });
  const { ref: containerRef, width } = useResizeDetector();
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace();
    stream.subscribe((data) => {
      for (const event of data.resourceAdded ?? []) {
        state.current.resources.set(event.resource.id, event.resource);
      }
      for (const event of data.resourceRemoved ?? []) {
        state.current.resources.delete(event.id);
      }
      for (const event of data.spanAdded ?? []) {
        state.current.spans.set(event.span.id, event.span);
      }
      forceUpdate({});
    });

    return () => {
      stream.close();
    };
  }, []);

  const [selectedFlameIndex, setSelectedFlameIndex] = useState(0);
  const roots = [...state.current.spans.values()].filter((s) => s.parentId === undefined);
  const flameGraph = buildFlameGraph(state.current, roots[Math.min(selectedFlameIndex, roots.length - 1)]?.id ?? 0);

  const handleBack = () => {
    setSelectedFlameIndex((idx) => Math.max(0, idx - 1));
  };

  const handleForward = () => {
    setSelectedFlameIndex((idx) => Math.min(roots.length - 1, idx + 1));
  };

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Grid<Resource> columns={columns} data={Array.from(state.current.resources.values())} />
      </div>
      <div ref={containerRef} className='border-t h-1/2 flex flex-col'>
        <div className='flex flex-row items-baseline justify-items-center p-2'>
          <ArrowLeft className='cursor-pointer' onClick={handleBack} />
          <div className='flex-1 text-center'>
            {selectedFlameIndex + 1} / {roots.length}
          </div>
          <ArrowRight className='cursor-pointer' onClick={handleForward} />
        </div>
        {flameGraph && <FlameChart
          className='flex-1'
          data={flameGraph}
        />}
      </div>
    </PanelContainer>
  );
};

const { helper } = createColumnBuilder<Resource>();
const columns: GridColumnDef<Resource, any>[] = [
  helper.accessor((resource) => `${sanitizeClassName(resource.className)}#${resource.instanceId}`, {
    id: 'name',
    size: 200,
  }),
  helper.accessor('info', {
    cell: (cell) => <div className='font-mono'>{JSON.stringify(cell.getValue())}</div>,
  }),
];

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
  const resource = span.resourceId !== undefined ? state.resources.get(span.resourceId) : undefined;
  const name = resource
    ? `${sanitizeClassName(resource.className)}#${resource.instanceId}.${span.methodName}`
    : span.methodName;

  const duration = span.endTs !== undefined ? +span.endTs - (+span.startTs) : undefined;
  const children = childSpans.flatMap((s) => buildFlameGraph(state, s.id));

  const visualDuration = duration ??
    (children.at(-1)?.duration ? (children.at(-1)!.start + children.at(-1)!.duration) : 10);

  return [{
    name,
    start: +span.startTs,
    duration: visualDuration,
    children: children,
  }];
};
