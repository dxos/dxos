//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type ReactiveEchoObject } from '@dxos/client/echo';
import { failUndefined } from '@dxos/debug';
import { useClient } from '@dxos/react-client';
import { Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import { Select, useTranslation } from '@dxos/react-ui';

import { getInvocationUrl, getUserFunctionUrlInMetadata } from '../../edge';
import { SCRIPT_PLUGIN } from '../../meta';
import { FunctionType, ScriptType } from '../../types';
import { DebugPanel } from '../DebugPanel';

export interface AutomationPanelProps {
  subject: ReactiveEchoObject<any>;
}

export const AutomationPanel = ({ subject }: AutomationPanelProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const space = getSpace(subject);

  // TODO(dmaretskyi): Parametric query.
  const functions = useQuery(
    space ?? undefined,
    Filter.schema(FunctionType, (fn) => (subject instanceof ScriptType ? fn.source === subject : fn.binding != null)),
    {},
    [subject],
  );

  const [selectedFunction, setSelectedFunction] = useState<FunctionType | null>(null);
  const chatFunction = subject instanceof ScriptType ? functions[0] : selectedFunction;

  return (
    <div className='h-full flex flex-col'>
      {!(subject instanceof ScriptType) && (
        <BindingSelect
          selectedFunction={selectedFunction}
          setSelectedFunction={setSelectedFunction}
          functions={functions}
        />
      )}
      {chatFunction && <ChatPanel fn={chatFunction} subject={subject} />}
      {subject instanceof ScriptType && functions.length === 0 && <div className='p-1'>{t('not deployed')}</div>}
    </div>
  );
};

export interface ChatPanelProps {
  fn: FunctionType;
  subject: ReactiveEchoObject<any>;
}

const ChatPanel = ({ fn, subject }: ChatPanelProps) => {
  const client = useClient();
  const space = getSpace(fn);
  const existingFunctionUrl = getUserFunctionUrlInMetadata(getMeta(fn));
  const functionUrl = useMemo(() => {
    if (!existingFunctionUrl) {
      return;
    }

    return getInvocationUrl(existingFunctionUrl, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
      subjectId: subject?.id,
    });
  }, [existingFunctionUrl, space, subject]);

  return <DebugPanel functionUrl={functionUrl} classNames='flex-1' />;
};

export interface BindingSelectProps {
  selectedFunction: FunctionType | null;
  setSelectedFunction: (fn: FunctionType) => void;
  functions: FunctionType[];
}

const BindingSelect = ({ selectedFunction, setSelectedFunction, functions }: BindingSelectProps) => {
  return (
    <Select.Root
      value={selectedFunction?.id}
      onValueChange={(id) => setSelectedFunction(functions.find((fn) => fn.id === id) ?? failUndefined())}
    >
      <Select.TriggerButton placeholder='Select value' />
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {functions.map(({ id, binding }) => (
              <Select.Option key={id} value={id}>
                {binding}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
