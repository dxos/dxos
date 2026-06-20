//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation, type Routine } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Panel, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { ObjectProperties } from '@dxos/react-ui-form';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { meta } from '#meta';

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; result: unknown }
  | { status: 'error'; error: Error };

export type RoutineArticleProps = AppSurface.ObjectArticleProps<Routine.Routine>;

export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
  const { hasAttention } = useAttention(attendableId);

  const invoke = useRoutineHandler(subject);
  const [state, setState] = useState<RunState>({ status: 'idle' });

  const handleRun = useCallback(async () => {
    setState({ status: 'running' });
    try {
      const result = await invoke();
      setState({ status: 'success', result });
    } catch (err) {
      setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
    }
  }, [invoke]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'run',
          {
            label: ['run-prompt.label', { ns: meta.profile.key }],
            icon: state.status === 'running' ? 'ph--spinner-gap--regular' : 'ph--play--regular',
            iconClassNames: state.status === 'running' ? 'animate-spin' : undefined,
            disabled: !hasAttention || state.status === 'running',
            disposition: 'toolbar',
            testId: 'routine.toolbar.run',
          },
          () => {
            void handleRun();
          },
        )
        .build(),
    [hasAttention, state.status, handleRun],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar classNames='dx-document' asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content classNames='dx-document flex flex-col gap-2'>
          <ObjectProperties object={subject} />
          <RoutineResult state={state} />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

//
// Result
//

const RoutineResult = ({ state }: { state: RunState }) => {
  const { t } = useTranslation(meta.profile.key);
  switch (state.status) {
    case 'idle':
      return null;
    case 'running':
      return <div className='p-2 text-sm text-subdued'>{t('routine-running.label')}</div>;
    case 'error':
      return <div className='p-2 text-sm text-error'>{state.error.message}</div>;
    case 'success':
      return <JsonHighlighter classNames='p-2! text-sm' data={state.result} />;
  }
};

//
// Hooks
//

const useRoutineHandler = (routine: Routine.Routine) => {
  const db = Obj.getDatabase(routine);
  const data = useMemo<Operation.Definition.Input<typeof AgentPrompt> | undefined>(() => {
    if (db && routine) {
      return {
        prompt: db.makeRef(Obj.getURI(routine)),
        input: {},
      };
    }
  }, [routine, db]);

  return useSpaceCallback(
    db?.spaceId,
    [Database.Service] as const,
    () => {
      invariant(data);
      return Operation.invoke(AgentPrompt, data);
    },
    [data],
  );
};
