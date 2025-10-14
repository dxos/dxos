//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type ScriptType } from '@dxos/functions';
import { createDocAccessor } from '@dxos/react-client/echo';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';
import { type TypescriptEditorProps } from '../TypescriptEditor/TypescriptEditor';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
} & Pick<TypescriptEditorProps, 'env'>;

// NOTE: ASSERT (TO VC) WHAT IS GOING TO HAPPEN AND GET EVIDENCE FROM EFFECT, ETC.

// TODO(burdon): Rail.
// TODO(burdon): Allow moving cursor between sections.
// TODO(burdon): Different section types (value, query, expression, prompt).
// TODO(burdon): Show result (incl. error, streaming response).
// TODO(burdon): Define actions for plugin.

export const NotebookStack = ({ notebook, env }: NotebookStackProps) => {
  // TODO(burdon): Rail isn't visible.
  return (
    <Stack orientation='vertical' size='contain' rail>
      {notebook?.cells.map((cell) => (
        <NotebookSection key={cell.id} script={cell} env={env} />
      ))}
    </Stack>
  );
};

type NotebookSectionProps = {
  script: ScriptType;
} & Pick<TypescriptEditorProps, 'env'>;

const NotebookSection = ({ script, env }: NotebookSectionProps) => {
  // TODO(burdon): Pass in Space.
  const extensions = undefined;
  const extensions2 = useMemo(
    () => [
      false && createDataExtensions({ id: script.id, text: createDocAccessor(script.source.target!, ['content']) }),
    ],
    [script],
  );

  return (
    <StackItem.Root role='section' item={script} classNames='flex flex-col'>
      <StackItem.Content classNames='flex flex-col'>
        <TypescriptEditor
          id={script.id}
          role='section'
          initialValue={script.source.target?.content}
          extensions={extensions}
          env={env}
        />
        <div className='p-2 border-t border-subduedSeparator text-description text-sm font-mono'>0</div>
      </StackItem.Content>
    </StackItem.Root>
  );
};
