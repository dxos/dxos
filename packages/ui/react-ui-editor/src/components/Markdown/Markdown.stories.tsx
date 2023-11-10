//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/react-client';
import { TextKind } from '@dxos/react-client/echo';
import { ClientDecorator, textGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { useId } from '@dxos/react-ui';

import { MarkdownEditor } from './Markdown';
import { Replicator, useYjsModel } from '../../testing';

export default {
  component: MarkdownEditor,
};

export const Default = {
  args: {
    model: {
      id: 'editor',
      content: 'Hello, Storybook!',
    },
  },
};

const replicator = new Replicator(TextKind.PLAIN);
export const WithYjs = {
  render: () => {
    const [generate, setGenerate] = useState(false);
    const generateId = useId('generate');

    const [id] = useState(PublicKey.random().toHex());
    const model = useYjsModel({ id, replicator });

    useDataGenerator({
      generator: generate ? textGenerator : undefined,
      options: { text: typeof model?.content !== 'string' ? model?.content : undefined },
    });

    return (
      <main className='flex-1 min-w-0 p-4'>
        <div id={generateId} className='flex'>
          <input type='checkbox' onChange={(event) => setGenerate(event.target.checked)} />
          Generate Data
        </div>
        <MarkdownEditor model={model} />
      </main>
    );
  },
  // TODO(wittjosiah): Decorator for doing this without clients being initialized?
  decorators: [ClientDecorator({ count: 2 })],
};
