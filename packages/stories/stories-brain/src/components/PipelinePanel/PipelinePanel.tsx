//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, Input, Panel, ScrollArea, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty, OrderedList } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

export type StageInfo = {
  id: string;
  description?: string;
  /** Whether the stage participates in the next run. */
  enabled: boolean;
};

export type PipelinePanelProps = ThemedClassName<{
  /** Stages composed into the pipeline, in execution order. */
  stages: StageInfo[];
  /** Controlled update: fired on checkbox toggle and drag reorder. */
  onStagesChanged?: (stages: StageInfo[]) => void;
  /** Id of the stage currently executing. */
  active?: string;
  /** Latest pipeline output (rendered as JSON). */
  output?: unknown;
}>;

const isStage = (value: any): value is StageInfo =>
  !!value && typeof value === 'object' && typeof value.id === 'string';

/**
 * Pipeline column (placeholder): the composed stages in execution order — each toggleable via a
 * checkbox and re-orderable by dragging — and the raw output of the latest run. Variants will
 * replace the output view with live per-stage progress and typed results.
 */
export const PipelinePanel = ({ classNames, stages, onStagesChanged, active, output }: PipelinePanelProps) => {
  const handleToggle = useCallback(
    (id: string, enabled: boolean) =>
      onStagesChanged?.(stages.map((stage) => (stage.id === id ? { ...stage, enabled } : stage))),
    [stages, onStagesChanged],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...stages];
      arrayMove(next, fromIndex, toIndex);
      onStagesChanged?.(next);
    },
    [stages, onStagesChanged],
  );

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Pipeline</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root padding>
          <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
            {stages.length === 0 && <Empty label='No stages.' />}
            <OrderedList.Root<StageInfo>
              items={stages}
              isItem={isStage}
              getId={(stage) => stage.id}
              onMove={handleMove}
              readonly={!onStagesChanged}
            >
              {({ items }) => (
                <OrderedList.Content>
                  {items.map((stage) => (
                    <OrderedList.Item
                      key={stage.id}
                      id={stage.id}
                      item={stage}
                      hover
                      classNames='grid grid-cols-[var(--dx-rail-item)_var(--dx-rail-item)_1fr_var(--dx-rail-item)] items-center gap-1 px-1 py-1'
                    >
                      <OrderedList.DragHandle />
                      <Input.Root>
                        <Input.Checkbox
                          checked={stage.enabled}
                          disabled={!onStagesChanged}
                          onCheckedChange={(next) => handleToggle(stage.id, next === true)}
                        />
                      </Input.Root>
                      <div className={mx('flex flex-col min-w-0', !stage.enabled && 'text-subdued')}>
                        <span className='font-medium truncate'>{stage.id}</span>
                        {stage.description && (
                          <span className='text-sm text-description truncate'>{stage.description}</span>
                        )}
                      </div>
                      {stage.id === active && (
                        <Icon icon='ph--spinner-gap--regular' size={4} classNames='animate-spin' />
                      )}
                    </OrderedList.Item>
                  ))}
                </OrderedList.Content>
              )}
            </OrderedList.Root>
            {output != null && (
              <>
                <h3 className='pt-2 text-sm text-description'>Output</h3>
                <pre className='bg-input-surface border border-subdued-separator rounded-sm p-2 text-xs overflow-x-auto'>
                  {JSON.stringify(output, null, 2)}
                </pre>
              </>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
