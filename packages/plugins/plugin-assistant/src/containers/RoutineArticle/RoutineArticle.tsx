//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Operation, type Routine } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { TemplateEditor } from '#components';
import { meta } from '#meta';

export type RoutineArticleProps = AppSurface.ObjectArticleProps<Routine.Routine>;

type RunState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'success'; result: unknown }
  | { status: 'error'; error: Error };

// TODO(burdon): Trigger editor.
export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { hasAttention } = useAttention(attendableId);
  const invoke = usePromptHandler(subject);
  const [state, setState] = useState<RunState>({ status: 'idle' });
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleRun = useCallback(async () => {
    setState({ status: 'running' });
    try {
      const result = await invoke();
      if (mountedRef.current) {
        setState({ status: 'success', result });
      }
    } catch (err) {
      if (mountedRef.current) {
        setState({ status: 'error', error: err instanceof Error ? err : new Error(String(err)) });
      }
    }
  }, [invoke]);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention || state.status === 'running'}>
          <Toolbar.IconButton
            iconOnly
            icon={state.status === 'running' ? 'ph--spinner-gap--regular' : 'ph--play--regular'}
            label={t('run-prompt.label')}
            onClick={handleRun}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='flex flex-col gap-2'>
        <TemplateEditor id={subject.id} template={subject.instructions} />
        <RoutineResult state={state} />
      </Panel.Content>
    </Panel.Root>
  );
};

const RoutineResult = ({ state }: { state: RunState }) => {
  const { t } = useTranslation(meta.id);
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

const usePromptHandler = (routine: Routine.Routine) => {
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
    [Database.Service, Feed.FeedService] as const,
    () => {
      invariant(data);
      return Operation.invoke(AgentPrompt, data);
    },
    [data],
  );
};
