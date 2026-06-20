//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { DatabaseSkill, WebSearchSkill } from '@dxos/assistant-toolkit';
import { Routine } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { MarkdownSkill } from '@dxos/plugin-markdown';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton } from '@dxos/react-ui';

import { AssistantOperation } from '#types';

export type RoutineListProps = AppSurface.ObjectSectionProps<Obj.Unknown>;

export const RoutineList = ({ subject }: RoutineListProps) => {
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(subject);
  const prompts = useQuery(db, Filter.type(Routine.Routine));
  if (!db) {
    return null;
  }

  return (
    <div className='flex gap-2'>
      {prompts.map((prompt, i) => (
        <div key={i}>
          <IconButton
            icon='ph--magic-wand--regular'
            label={Obj.getLabel(prompt) ?? Obj.getURI(prompt)}
            onClick={() => {
              void invokePromise(AssistantOperation.RunPromptInNewChat, {
                db,
                prompt: Ref.make(prompt),
                objects: [subject],
                // TODO(burdon): Concifgure from Prompt object.
                skills: [DatabaseSkill.key, WebSearchSkill.key, MarkdownSkill.key],
                background: true,
              });
            }}
          />
        </div>
      ))}
    </div>
  );
};
