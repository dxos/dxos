//
// Copyright 2023 DXOS.org
//

import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';
import { FlameGraph } from 'react-flame-graph';

import { createKeyColumn, createTextColumn, defaultGridSlots, Grid, GridColumn } from '@dxos/aurora-grid';
import { Resource, Span } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';

import { PanelContainer } from '../../../components';

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
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace();
    stream.subscribe(
      (data) => {
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
      },
      (error) => {
        console.error(error);
      },
    );
    return () => {
      stream.close();
    };
  }, []);

  const [selectedFlameIndex, setSelectedFlameIndex] = useState(0);

  const roots = [...state.current.spans.values()].filter((s) => s.parentId === undefined);
  const flameGraph = buildFlameGraph(state.current, roots[Math.min(selectedFlameIndex, roots.length - 1)]?.id ?? 0);

  const selectPrev = () => {
    setSelectedFlameIndex((idx) => Math.max(0, idx - 1));
  };

  const selectNext = () => {
    setSelectedFlameIndex((idx) => Math.min(roots.length - 1, idx + 1));
  };

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Grid<Resource>
          columns={columns}
          data={Array.from(state.current.resources.values())}
          slots={defaultGridSlots}
        />
      </div>
      <div>
        <div className='flex flex-row items-baseline justify-items-center m-2'>
          <ArrowLeft className='cursor-pointer' onClick={selectPrev} />
          <div className='flex-1 text-center'>
            {selectedFlameIndex + 1} / {roots.length}
          </div>
          <ArrowRight className='cursor-pointer' onClick={selectNext} />
        </div>
        {flameGraph && <FlameGraph data={flameGraph} height={200} width={400} />}
      </div>
    </PanelContainer>
  );
};

const columns: GridColumn<Resource>[] = [
  createKeyColumn('id', { key: true }),
  createTextColumn('name', {
    accessor: (resource) => `${sanitizeClassName(resource.className)}#${resource.instanceId}`,
  }),
  createTextColumn('info'),
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

const buildFlameGraph = (state: State, rootId: number): any => {
  const span = state.spans.get(rootId);
  if (!span) {
    return undefined;
  }

  const childSpans = [...state.spans.values()].filter((s) => s.parentId === span.id);

  const resource = span.resourceId !== undefined ? state.resources.get(span.resourceId) : undefined;
  const name = resource
    ? `${sanitizeClassName(resource.className)}#${resource.instanceId}.${span.methodName}`
    : span.methodName;

  return {
    name,
    value: +(span.endTs ?? '999') - +span.startTs,
    children: childSpans.map((s) => buildFlameGraph(state, s.id)),
  };
};
