//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, Panel, ScrollArea, Select, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
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
  /** Whether the pipeline is currently running (drives the toolbar spinner). */
  busy?: boolean;
}>;

/**
 * Pipeline column: a toolbar picker selecting which pipeline runs, and the fixed, read-only list of
 * that pipeline's composed stages in execution order (disabled stages dimmed).
 */
export const PipelinePanel = ({ classNames, pipelines, selected, onSelect, busy }: PipelinePanelProps) => {
  const pipeline = pipelines.find((item) => item.id === selected) ?? pipelines[0];
  const stages = pipeline?.stages ?? [];
  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Select.Root value={selected} onValueChange={onSelect}>
            <Select.TriggerButton placeholder='Pipeline' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {pipelines.map((item) => (
                    <Select.Option key={item.id} value={item.id}>
                      {item.label}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <div role='none' className='grow' />
          {busy && <Icon icon='ph--spinner-gap--regular' size={4} classNames='animate-spin' />}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root padding>
          <ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>
            {stages.length === 0 && <Empty label='No stages.' />}
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={mx(
                  'flex flex-col min-w-0 bg-card-surface border border-subdued-separator rounded-sm px-3 py-2',
                  !stage.enabled && 'opacity-50',
                )}
              >
                <span className='font-medium truncate'>{stage.id}</span>
                {stage.description && <span className='text-sm text-description truncate'>{stage.description}</span>}
              </div>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
