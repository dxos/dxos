//
// Copyright 2023 DXOS.org
//

import * as Tabs from '@radix-ui/react-tabs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormatEnum } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { type Span } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';
import { DynamicTable, type TableFeatures, type TablePropertyDefinition } from '@dxos/react-ui-table';

import { PanelContainer } from '../../../components';

import { LogTable } from './LogTable';
import { MetricsView } from './MetricsView';
import { TraceView } from './TraceView';
import { type ResourceState, type State } from './types';

export const TracingPanel = () => {
  const client = useClient();

  // Store state using useState instead of ref
  const [state, setState] = useState<State>({
    resources: new Map<number, ResourceState>(),
    spans: new Map<number, Span>(),
  });
  const [live, setLive] = useState(true);

  const [selectedResourceId, setSelectedResourceId] = useState<number>();
  const selectedResource: ResourceState | undefined =
    selectedResourceId !== undefined ? state.resources.get(selectedResourceId) : undefined;

  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace();
    stream.subscribe(
      (data) => {
        if (!live) {
          return;
        }
        setState((prevState) => {
          // Create new map references to trigger re-render
          const newResources = new Map(prevState.resources);
          const newSpans = new Map(prevState.spans);

          for (const event of data.resourceAdded ?? []) {
            const existing = newResources.get(event.resource.id);
            if (!existing) {
              newResources.set(event.resource.id, { resource: event.resource, spans: [], logs: [] });
            } else {
              existing.resource = event.resource;
            }
          }

          for (const event of data.resourceRemoved ?? []) {
            newResources.delete(event.id);
          }

          for (const event of data.spanAdded ?? []) {
            newSpans.set(event.span.id, event.span);
            if (event.span.parentId === undefined) {
              const resource = newResources.get(event.span.resourceId!);
              if (resource) {
                resource.spans.push(event.span);
              }
            }
          }

          for (const event of data.logAdded ?? []) {
            const resource = newResources.get(event.log.meta!.resourceId!);
            if (!resource) {
              return prevState; // No changes
            }
            resource.logs.push(event.log);
          }

          return {
            resources: newResources,
            spans: newSpans,
          };
        });
      },
      (err) => {
        log.catch(err);
      },
    );

    return () => {
      void stream.close();
    };
  }, [client.services.services.TracingService, live]);

  const containerRef = useRef<HTMLDivElement>(null);

  const resourceProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'name', format: FormatEnum.JSON, size: 200 },
      { name: 'logs', format: FormatEnum.Number, size: 120 },
      { name: 'spans', format: FormatEnum.Number, size: 120 },
      { name: 'info', format: FormatEnum.JSON },
    ],
    [],
  );

  const rows = useMemo(
    () =>
      Array.from(state.resources.values()).map((resourceState) => ({
        id: String(resourceState.resource.id),
        name: resourceState.resource.className,
        logs: resourceState.logs.length,
        spans: resourceState.spans.length,
        info: JSON.stringify(resourceState.resource.info),
      })),
    [state.resources],
  );

  const handleRowClicked = useCallback((row: any) => {
    if (!row) {
      setSelectedResourceId(undefined);
      return;
    }
    setSelectedResourceId(Number(row.id));
  }, []);

  const features: Partial<TableFeatures> = useMemo(() => ({ selection: { enabled: true, mode: 'single' } }), []);

  // TODO(ZaymonFC): Do we need these visual specializations from the old table?
  //  - 'name' column: Special ResourceName component
  //  - 'info' column: font-mono + text-green-500 styling for JSON

  return (
    <PanelContainer classNames='grid grid-rows-[1fr_1fr] divide-y divide-separator'>
      <DynamicTable rows={rows} properties={resourceProperties} features={features} onRowClick={handleRowClicked} />
      <Tabs.Root defaultValue='details' className='flex flex-col grow overflow-hidden'>
        <Tabs.List className='flex divide-x divide-separator border-b border-separator'>
          <Tabs.Trigger className='flex-1' value='details'>
            Details
          </Tabs.Trigger>
          <Tabs.Trigger className='flex-1' value='logs'>
            Logs
          </Tabs.Trigger>
          <Tabs.Trigger className='flex-1' value='spans'>
            Spans
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value='details' className='grow overflow-auto'>
          <MetricsView resource={selectedResource?.resource} />
        </Tabs.Content>

        <Tabs.Content ref={containerRef} value='logs' className='grow'>
          <LogTable logs={selectedResource?.logs ?? []} />
        </Tabs.Content>

        <Tabs.Content value='spans' className='grow overflow-hidden'>
          <TraceView state={state} resourceId={selectedResourceId} live={live} onLiveChanged={setLive} />
        </Tabs.Content>
      </Tabs.Root>
    </PanelContainer>
  );
};
