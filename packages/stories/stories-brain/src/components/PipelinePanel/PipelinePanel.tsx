//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, Empty, Panel, ScrollArea, Select, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type StageInfo = {
  id: string;
  description?: string;
  /** Whether the stage participates in the run (configured by the story; shown dimmed when false). */
  enabled: boolean;
};

export type PipelineInfo = {
  id: string;
  label: string;
  /** Fixed stage list for this pipeline, in execution order. */
  stages: StageInfo[];
};

export type PipelinePanelProps = ThemedClassName<{
  /** Available pipelines; the toolbar picker selects which one runs. */
  pipelines: PipelineInfo[];
  /** Selected pipeline id. */
  selected: string;
  onSelect: (id: string) => void;
  /** Whether the pipeline is currently running (drives the start/stop toggle). */
  running?: boolean;
  /** Count of objects processed by the current/last run (reset when a run starts). */
  processed?: number;
  /** Start the selected pipeline over the current input. */
  onStart?: () => void;
  /** Interrupt the in-flight run. */
  onStop?: () => void;
}>;

/**
 * Pipeline column: a toolbar picker selecting which pipeline runs, a start/stop toggle, a live count
 * of objects processed, and the fixed, read-only list of the pipeline's composed stages in execution
 * order (disabled stages dimmed).
 */
export const PipelinePanel = ({
  classNames,
  pipelines,
  selected,
  onSelect,
  running,
  processed = 0,
  onStart,
  onStop,
}: PipelinePanelProps) => {
  const pipeline = pipelines.find((item) => item.id === selected) ?? pipelines[0];
  const stages = pipeline?.stages ?? [];
  return (
    <Panel.Root classNames={classNames}>
      <Panel.Header>
        <Toolbar.Root>
          <Select.Root
            value={[selected]}
            onValueChange={({ value: [value] }) => onSelect(value)}
            items={pipelines.map((item) => ({ value: item.id, label: item.label }))}
          >
            <Select.Trigger placeholder='Pipeline' />
            <Select.Content>
              {pipelines.map((item) => (
                <Select.Item key={item.id} item={{ value: item.id, label: item.label }} />
              ))}
            </Select.Content>
          </Select.Root>
          <div className='grow' />
          <span className='text-sm text-description tabular-nums'>{processed} processed</span>
          <Button
            icon={running ? 'ph--stop--regular' : 'ph--play--regular'}
            iconOnly
            label={running ? 'Stop' : 'Start'}
            disabled={running ? !onStop : !onStart}
            onClick={() => (running ? onStop?.() : onStart?.())}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
            {stages.length === 0 && <Empty>No stages.</Empty>}
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={mx(
                  'flex flex-col min-w-0 dx-card-surface border border-subdued-separator rounded-sm px-3 py-2',
                  !stage.enabled && 'opacity-50',
                )}
              >
                <span className='font-medium truncate'>{stage.id}</span>
                {stage.description && <span className='text-sm text-description truncate'>{stage.description}</span>}
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
