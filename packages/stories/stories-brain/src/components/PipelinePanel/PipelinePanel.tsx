//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, Panel, ScrollArea, type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

export type StageInfo = {
  id: string;
  description?: string;
  /** Whether the stage participates in the run (configured by the story; shown dimmed when false). */
  enabled: boolean;
};

export type PipelinePanelProps = ThemedClassName<{
  /** Stages composed into the pipeline, in execution order. Fixed — configured by the story. */
  stages: StageInfo[];
  /** Whether the pipeline is currently running (drives the toolbar spinner). */
  busy?: boolean;
  /** Latest pipeline output (rendered as JSON). */
  output?: unknown;
}>;

/**
 * Pipeline column: the fixed, read-only list of composed stages in execution order (the pipeline
 * shape is configured by the story, not edited here), plus the raw output of the latest run.
 */
export const PipelinePanel = ({ classNames, stages, busy, output }: PipelinePanelProps) => (
  <Panel.Root classNames={classNames}>
    <Panel.Toolbar asChild>
      <Toolbar.Root>
        <Toolbar.Text>Pipeline</Toolbar.Text>
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
          {/* {output != null && (
            <>
              <h3 className='pt-2 text-sm text-description'>Output</h3>
              <pre className='bg-input-surface border border-subdued-separator rounded-sm p-2 text-xs overflow-x-auto'>
                {JSON.stringify(output, null, 2)}
              </pre>
            </>
          )} */}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel.Content>
  </Panel.Root>
);
