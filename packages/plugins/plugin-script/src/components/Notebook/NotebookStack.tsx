//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Stack, StackItem } from '@dxos/react-ui-stack';

import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
};

// TODO(burdon): Allow moving cursor between sections.
// TODO(burdon): Different section types (value, query, expression, prompt).
// TODO(burdon): Show result (incl. error, streaming response).
export const NotebookStack = ({ notebook }: NotebookStackProps) => {
  // TODO(burdon): Rail isn't visible.
  return (
    <Stack orientation='vertical' size='contain' rail>
      {notebook?.cells.map((cell) => (
        <StackItem.Root key={cell.id} role='section' item={cell} classNames='flex flex-col'>
          <StackItem.Content>
            <TypescriptEditor id={cell.id} role='section' initialValue={cell.source.target?.content} />
          </StackItem.Content>
        </StackItem.Root>
      ))}
    </Stack>
  );
};
