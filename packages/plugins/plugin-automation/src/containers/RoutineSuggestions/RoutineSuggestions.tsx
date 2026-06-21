//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { DatabaseBlueprint, WebSearchBlueprint } from '@dxos/assistant-toolkit';
import { Routine } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { MarkdownBlueprint } from '@dxos/plugin-markdown';
import { useQuery } from '@dxos/react-client/echo';
import { IconButton } from '@dxos/react-ui';

import { AutomationOperation } from '#types';

export type RoutineSuggestionsProps = AppSurface.ObjectSectionProps<Obj.Unknown>;

export const RoutineSuggestions = ({ subject }: RoutineSuggestionsProps) => {
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
              void invokePromise(AutomationOperation.RunPromptInNewChat, {
                db,
                prompt: Ref.make(prompt),
                objects: [subject],
                // TODO(burdon): Concifgure from Prompt object.
                blueprints: [DatabaseBlueprint.key, WebSearchBlueprint.key, MarkdownBlueprint.key],
                background: true,
              });
            }}
          />
        </div>
      ))}
    </div>
  );
};
