//
// Copyright 2023 DXOS.org
//

import * as Tabs from '@radix-ui/react-tabs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FormatEnum } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type Span } from '@dxos/protocols/proto/dxos/tracing';
import { useClient } from '@dxos/react-client';
import { DynamicTable, type TablePropertyDefinition } from '@dxos/react-ui-table';
import { mx } from '@dxos/react-ui-theme';

import { LogTable } from './LogTable';
import { MetricsView } from './MetricsView';
import { TraceView } from './TraceView';
import { type ResourceState, type State } from './types';
import { PanelContainer } from '../../../components';

export const TracingPanel = () => {
  const client = useClient();

  // Store state using useState instead of ref
  const [state, setState] = useState<State>({
    resources: new Map<number, ResourceState>(),
    spans: new Map<number, Span>(),
  });

  const [selectedResourceId, setSelectedResourceId] = useState<number>();
  const selectedResource: ResourceState | undefined =
    selectedResourceId !== undefined ? state.resources.get(selectedResourceId) : undefined;

  useEffect(() => {
    const stream = client.services.services.TracingService!.streamTrace();
    stream.subscribe(
      (data) => {
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
  }, [client.services.services.TracingService]);

  const tabClass = mx(
    'radix-state-active:border-b-neutral-700 focus-visible:radix-state-active:border-b-transparent radix-state-inactive:bg-neutral-50 dark:radix-state-active:border-b-neutral-100 dark:radix-state-active:bg-neutral-500 focus-visible:dark:radix-state-active:border-b-transparent dark:radix-state-inactive:bg-neutral-800',
    'flex-1 px-3 py-2.5',
    'first:rounded-tl-lg last:rounded-tr-lg',
    'border-b first:border-r last:border-l',
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const resourceProperties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'name', format: FormatEnum.JSON, size: 200 },
      { name: 'logs', format: FormatEnum.Number, size: 100 },
      { name: 'spans', format: FormatEnum.Number, size: 100 },
      { name: 'info', format: FormatEnum.JSON },
    ],
    [],
  );

  const resourceData = useMemo(() => {
    return Array.from(state.resources.values()).map((resourceState) => ({
      id: String(resourceState.resource.id),
      name: resourceState.resource.className,
      logs: resourceState.logs.length,
      spans: resourceState.spans.length,
      info: JSON.stringify(resourceState.resource.info),
    }));
  }, [state.resources]);

  const handleResourceSelectionChanged = useCallback((selectedIds: string[]) => {
    if (selectedIds.length === 0) {
      setSelectedResourceId(undefined);
      return;
    }
    setSelectedResourceId(Number(selectedIds[selectedIds.length - 1]));
  }, []);

  // TODO(ZaymonFC): Do we need these visual specializations from the old table?
  //  - 'name' column: Special ResourceName component
  //  - 'info' column: font-mono + text-green-500 styling for JSON

  return (
    <PanelContainer>
      <div className='h-1/3'>
        <DynamicTable
          data={resourceData}
          properties={resourceProperties}
          onSelectionChanged={handleResourceSelectionChanged}
        />
      </div>

      <div className='flex flex-col h-2/3 overflow-hidden border-t'>
        <Tabs.Root defaultValue='details' className='flex flex-col grow overflow-hidden'>
          <Tabs.List className='flex'>
            <Tabs.Trigger className={tabClass} value='details'>
              Details
            </Tabs.Trigger>
            <Tabs.Trigger className={tabClass} value='logs'>
              Logs ({selectedResource?.logs.length ?? 0})
            </Tabs.Trigger>
            <Tabs.Trigger className={tabClass} value='spans'>
              Spans ({selectedResource?.spans.length ?? 0})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value='details' className='grow overflow-auto'>
            <MetricsView resource={selectedResource?.resource} />
          </Tabs.Content>

          <Tabs.Content ref={containerRef} value='logs' className='grow'>
            <LogTable logs={selectedResource?.logs ?? []} />
          </Tabs.Content>

          <Tabs.Content value='spans' className='grow overflow-hidden'>
            <TraceView state={state} resourceId={selectedResourceId} />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </PanelContainer>
  );
};
