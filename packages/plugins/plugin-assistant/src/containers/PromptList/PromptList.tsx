//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { DatabaseBlueprint, MarkdownBlueprint, WebSearchBlueprint } from '@dxos/assistant-toolkit';
import { Prompt, Template } from '@dxos/blueprints';
import { Filter, Obj } from '@dxos/echo';
import { IconButton } from '@dxos/react-ui';
import { useQuery } from '@dxos/react-client/echo';
import { SurfaceComponentProps } from '@dxos/app-toolkit/ui';

import { AssistantOperation } from '../../types';

export type PromptListProps = SurfaceComponentProps<Obj.Unknown>;

export const PromptList = ({ subject }: PromptListProps) => {
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(subject);
  const prompts = useQuery(db, Filter.type(Prompt.Prompt));
  if (!db) {
    return null;
  }

  return (
    <div role='none' className='flex gap-2'>
      {prompts.map((prompt, i) => (
        <div key={i}>
          <IconButton
            icon='ph--magic-wand--regular'
            label={Obj.getLabel(prompt) ?? Obj.getDXN(prompt).toString()}
            onClick={async () => {
              const { content } = await prompt.instructions.source.load();
              void invokePromise(AssistantOperation.RunPromptInNewChat, {
                db,
                prompt: Template.process(content),
                objects: [subject],
                blueprints: [DatabaseBlueprint.key, WebSearchBlueprint.key, MarkdownBlueprint.key],
              });
            }}
          />
        </div>
      ))}
    </div>
  );
};
