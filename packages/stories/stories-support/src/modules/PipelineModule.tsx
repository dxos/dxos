//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { StatusList, type StatusListStatus } from '@dxos/react-ui-list';
import * as Card from '@dxos/react-ui/Card';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Support } from '../types/index.ts';
import { useSupport } from './SupportContext.tsx';

const STAGE_LABELS: Record<Support.StageId, string> = {
  ingest: 'Ingest',
  entities: 'Extract entities',
  facts: 'Extract facts',
  research: 'Research',
  respond: 'Respond',
  triage: 'Triage',
};

const STATUS_LABELS: Record<StatusListStatus, string> = {
  'success': 'Done',
  'failed': 'Failed',
  'not-started': 'Not started',
  'working': 'Working',
};

/** One message's card: a row per stage, the stage being run the brightest. */
const RunCard = ({ run }: { run: Support.MessageRun }) => (
  <StatusList.Root aria-label={run.title} data-testid='support.run' data-message={run.message}>
    <Card.Header>
      <Card.Title>{run.title}</Card.Title>
    </Card.Header>
    {run.stages.map((stage) => (
      <StatusList.Item
        key={stage.id}
        status={stage.status}
        statusLabel={STATUS_LABELS[stage.status]}
        data-stage={stage.id}
        data-testid='support.run.stage'
      >
        {stage.detail ? `${STAGE_LABELS[stage.id]}: ${stage.detail}` : STAGE_LABELS[stage.id]}
      </StatusList.Item>
    ))}
  </StatusList.Root>
);

/** The pipeline's progress: a card per message, newest first, each stage a row with its status. */
export const PipelineModule = () => {
  const runs = useSupport()?.runs ?? [];
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{runs.length > 0 ? `Pipeline (${runs.length})` : 'Pipeline'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            {runs.length === 0 ? (
              <Status.Empty>No messages processed yet.</Status.Empty>
            ) : (
              <Layout.Flex column gap='md' classNames='p-trim-md'>
                {runs.map((run) => (
                  <RunCard key={run.message} run={run} />
                ))}
              </Layout.Flex>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
