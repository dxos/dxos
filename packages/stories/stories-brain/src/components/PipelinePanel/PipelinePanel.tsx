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
};

export type PipelinePanelProps = ThemedClassName<{
  /** Stages composed into the pipeline, in execution order. */
  stages: StageInfo[];
  /** Id of the stage currently executing. */
  active?: string;
  /** Latest pipeline output (rendered as JSON). */
  output?: unknown;
}>;

/**
 * Pipeline column (placeholder): the composed stages in execution order and the raw output of the
 * latest run. Variants will replace this with live per-stage progress and typed output views.
 */
export const PipelinePanel = ({ classNames, stages, active, output }: PipelinePanelProps) => (
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
          {stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              {index > 0 && <Icon icon='ph--arrow-down--regular' size={4} classNames='self-center text-subdued' />}
              <StageRow stage={stage} active={stage.id === active} />
            </React.Fragment>
          ))}
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

const StageRow = ({ stage, active }: { stage: StageInfo; active: boolean }) => (
  <div
    className={mx(
      'shrink-0 flex items-center gap-2 px-3 py-2 bg-card-surface border rounded-sm',
      active ? 'border-primary-separator' : 'border-subdued-separator',
    )}
  >
    <Icon
      icon={active ? 'ph--spinner-gap--regular' : 'ph--function--regular'}
      size={4}
      classNames={active ? 'animate-spin' : 'text-subdued'}
    />
    <div className='flex flex-col min-w-0'>
      <span className='font-medium truncate'>{stage.id}</span>
      {stage.description && <span className='text-sm text-description truncate'>{stage.description}</span>}
    </div>
  </div>
);
