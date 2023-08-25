//
// Copyright 2023 DXOS.org
//

import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { FlameChart } from '../../../components/FlameChart'; // Deliberately not using the common components export to aid in code-splitting.
import * as Tabs from '@radix-ui/react-tabs';

import { createColumnBuilder, Grid, GridColumnDef } from '@dxos/aurora-grid';
import { Metric, Resource, Span } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';
import { AxisOptions, Chart } from "react-charts";

import { JsonTreeView, PanelContainer } from '../../../components';
import type { FlameChartNodes } from 'flame-chart-js';
import { isNotNullOrUndefined } from '@dxos/util';
import { LogEntry } from '@dxos/protocols/proto/dxos/client/services';
import { mx } from '@dxos/aurora-theme';
import { levels, LogLevel } from '@dxos/log';

type ResourceState = {
  resource: Resource;
  spans: Span[];
  logs: LogEntry[];
}

type State = {
  resources: Map<number, ResourceState>;
  spans: Map<number, Span>;
};

export const TracingPanel = () => {
  const client = useClient();

  // Trace state.
  const state = useRef<State>({
    resources: new Map<number, ResourceState>(),
    spans: new Map<number, Span>(),
  });
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace();
    stream.subscribe((data) => {
      for (const event of data.resourceAdded ?? []) {
        const existing = state.current.resources.get(event.resource.id);
        if (!existing) {
          state.current.resources.set(event.resource.id, { resource: event.resource, spans: [], logs: [] });
        } else {
          existing.resource = event.resource;
        }
      }
      for (const event of data.resourceRemoved ?? []) {
        state.current.resources.delete(event.id);
      }
      for (const event of data.spanAdded ?? []) {
        state.current.spans.set(event.span.id, event.span);
        if (event.span.parentId === undefined) {
          const resource = state.current.resources.get(event.span.resourceId!);
          if (resource) {
            resource.spans.push(event.span);
          }
        }
      }
      for (const event of data.logAdded ?? []) {
        const resource = state.current.resources.get(event.log.meta!.resourceId!);
        if (!resource) {
          continue;
        }
        resource.logs.push(event.log);
      }

      forceUpdate({});
      console.log(state.current)
    }, err => {
      console.error(err)
    });

    return () => {
      stream.close();
    };
  }, []);

  // Selections.
  const [selectedResourceId, setSelectedResourceId] = useState<number | undefined>(undefined);
  const [selectedFlameIndex, setSelectedFlameIndex] = useState(0);

  const selectedResource = selectedResourceId !== undefined ? state.current.resources.get(selectedResourceId) : undefined;

  // Spans
  const graphs = useMemo(() => {
    const spans = selectedResourceId === undefined ? [...state.current.spans.values()].filter((s) => s.parentId === undefined) : selectedResource?.spans ?? [];
    return buildMultiFlameGraph(state.current, spans.map(s => s.id));
  }, [selectedResource, state.current.spans.size]);
  const flameGraph = graphs[Math.min(selectedFlameIndex, graphs.length - 1)];

  const handleBack = () => {
    setSelectedFlameIndex((idx) => Math.max(0, idx - 1));
  };

  const handleForward = () => {
    setSelectedFlameIndex((idx) => Math.min(graphs.length - 1, idx + 1));
  };

  const tabClass = mx(
    "group",
    "first:rounded-tl-lg last:rounded-tr-lg",
    "border-b first:border-r last:border-l",
    "border-gray-300 dark:border-gray-600",
    "radix-state-active:border-b-gray-700 focus-visible:radix-state-active:border-b-transparent radix-state-inactive:bg-gray-50 dark:radix-state-active:border-b-gray-100 dark:radix-state-active:bg-gray-900 focus-visible:dark:radix-state-active:border-b-transparent dark:radix-state-inactive:bg-gray-800",
    "flex-1 px-3 py-2.5",
    "focus:radix-state-active:border-b-red",
    "focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75"
  )

  return (
    <PanelContainer>
      <div className='h-1/2 overflow-auto'>
        <Grid<ResourceState>
          columns={columns}
          data={Array.from(state.current.resources.values())}
          select='single-toggle'
          selected={selectedResourceId !== undefined ? [state.current.resources.get(selectedResourceId)].filter(isNotNullOrUndefined) : undefined}
          onSelectedChange={resources => setSelectedResourceId(resources?.[0]?.resource.id)} />
      </div>
      <Tabs.Root defaultValue='details' className='border-t h-1/2 flex flex-col'>
        <Tabs.List className='flex w-full rounded-t-lg bg-white dark:bg-gray-800'>
          <Tabs.Trigger className={tabClass} value='details'>Details</Tabs.Trigger>
          <Tabs.Trigger className={tabClass} value='logs'>Logs ({selectedResource?.logs.length ?? 0})</Tabs.Trigger>
          <Tabs.Trigger className={tabClass} value='spans'>Spans ({selectedResource?.spans.length ?? 0})</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value='details'>
          {
            selectedResource && <>
              <h3 className='text-lg m-2'><ResourceName resource={selectedResource.resource} /></h3>
              <div className='text-md border-b'>Info</div>
              <JsonTreeView data={selectedResource.resource.info} />
              <div className='text-md border-b'>Metrics</div>
              {selectedResource.resource.metrics?.map((metric, idx) => (
                <MetricView key={idx} metric={metric} />
              ))}
            </>
          }
        </Tabs.Content>
        <Tabs.Content value='logs'>
          <Grid<LogEntry>
            columns={logColumns}
            data={selectedResource?.logs ?? []}
          />
        </Tabs.Content>
        <Tabs.Content value='spans' className='flex flex-col flex-1'>
          <div className='flex flex-row items-baseline justify-items-center p-2'>
            <ArrowLeft className='cursor-pointer' onClick={handleBack} />
            <div className='flex-1 text-center'>
              Thread {selectedFlameIndex + 1} / {graphs.length}
            </div>
            <ArrowRight className='cursor-pointer' onClick={handleForward} />
          </div>
          {flameGraph && <FlameChart
            className='flex-1'
            data={flameGraph}
          />}
        </Tabs.Content>
      </Tabs.Root>
    </PanelContainer>
  );
};

const { helper } = createColumnBuilder<ResourceState>();
const columns: GridColumnDef<ResourceState, any>[] = [
  helper.accessor('resource', {
    id: 'name',
    size: 200,
    cell: (cell) => <ResourceName resource={cell.getValue()} />,
  }),
  helper.accessor((state) => state.logs.length, {
    id: 'logs',
    size: 50,
  }),
  helper.accessor((state) => state.spans.length, {
    id: 'spans',
    size: 50,
  }),
  helper.accessor(state => state.resource.info, {
    id: 'info',
    cell: (cell) => <div className='font-mono'>{JSON.stringify(cell.getValue())}</div>,
  }),
];

const ResourceName = ({ resource }: { resource: Resource }) => (
  <span>{sanitizeClassName(resource.className)}<span className='text-gray-400'>#{resource.instanceId}</span></span>
)


const MetricView = ({ metric }: { metric: Metric }) => {
  if (metric.counter) {
    return <span>{metric.name}: {metric.counter.value} {metric.counter.units ?? ''}</span>
  } else if (metric.timeSeries) {

    const primaryAxis: AxisOptions<any> = useMemo(() => ({ scaleType: 'linear', getValue: (point: any) => point.idx as number }), [])
    const secondaryAxes: AxisOptions<any>[] = useMemo(() => [{ elementType: 'bar', getValue: (point: any) => point.value as number }], [])

    return (
      <div className='m-2'>
        <div className='text-lg'>{metric.name}</div>
        <div>total: {JSON.stringify(metric.timeSeries.tracks?.reduce((acc, track) => ({ ...acc, [track.name]: track.total }), {}))}</div>
        <div className='w-full h-[100px] m-2'>
          <Chart
            options={{
              data: metric.timeSeries.tracks?.map(track => ({
                label: track.name,
                data: track.points?.map((p, idx) => ({ idx, value: p.value })) ?? [],
              })) ?? [],
              primaryAxis,
              secondaryAxes,

            }}
          />
        </div>
      </div>
    )
  } else if (metric.custom) {
    return <JsonTreeView data={{ [metric.name]: metric.custom.payload }} />
  } else {
    return <JsonTreeView data={metric} />
  }
}


// TODO(dmaretskyi): Unify with Logging panel.
const colors: { [index: number]: string } = {
  [LogLevel.TRACE]: 'text-gray-700',
  [LogLevel.DEBUG]: 'text-green-700',
  [LogLevel.INFO]: 'text-blue-700',
  [LogLevel.WARN]: 'text-orange-700',
  [LogLevel.ERROR]: 'text-red-700',
};

const shortFile = (file?: string) => file?.split('/').slice(-1).join('/');


const logColumns = (() => {
  const { helper, builder } = createColumnBuilder<LogEntry>();
  const columns: GridColumnDef<LogEntry, any>[] = [
    helper.accessor('timestamp', builder.createDate()),
    helper.accessor(
      (entry) =>
        Object.entries(levels)
          .find(([, level]) => level === entry.level)?.[0]
          .toUpperCase(),
      {
        id: 'level',
        size: 60,
        cell: (cell) => <div className={colors[cell.row.original.level]}>{cell.getValue()}</div>,
      },
    ),
    helper.accessor((entry) => `${shortFile(entry.meta?.file)}:${entry.meta?.line}`, { id: 'file', size: 160 }),
    helper.accessor('message', {}),
  ];
  return columns;
})();



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

const buildMultiFlameGraph = (state: State, roots: number[]): FlameChartNodes[] => {
  const endTimes: number[] = []
  const graphs: FlameChartNodes[] = []

  for (const rootId of roots) {
    const nodes = buildFlameGraph(state, rootId);
    const startTime = nodes[0].start;

    let found = false;
    for (let idx in endTimes) {
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

  return graphs
}
