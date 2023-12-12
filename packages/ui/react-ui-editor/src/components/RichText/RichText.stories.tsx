//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/react-client';
import { TextKind } from '@dxos/react-client/echo';
import { ClientDecorator, textGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { useId } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { RichTextEditor, type RichTextEditorProps } from './RichText';
import { Replicator, useYjsModel } from '../../testing';

export default {
  component: RichTextEditor,
  decorators: [withTheme],
};

export const Default = {
  args: {
    model: {
      id: 'editor',
      content: 'Hello, Storybook!',
    },
  },
};

const replicator = new Replicator(TextKind.RICH);
export const WithYjs = {
  render: (args: Omit<RichTextEditorProps, 'model'>) => {
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
        <RichTextEditor
          {...args}
          model={model}
          slots={{
            editor: {
              className: mx(
                'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
                args.slots?.editor?.className,
              ),
            },
          }}
        />
      </main>
    );
  },
  // TODO(wittjosiah): Decorator for doing this without clients being initialized?
  decorators: [ClientDecorator({ count: 2 })],
};
