//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { PublicKey } from '@dxos/react-client';
import { TextKind } from '@dxos/react-client/echo';
import { ClientRepeater, textGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { useId, Input } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './TextEditor';
import { Replicator, useYjsModel } from '../../testing';

export default {
  component: MarkdownEditor,
  decorators: [withTheme],
};

const replicator = new Replicator(TextKind.PLAIN);

export const Default = {
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
        <div id={generateId} className='flex gap-2'>
          <Input.Root>
            <Input.Checkbox checked={generate} onCheckedChange={(checked) => setGenerate(!!checked)} />
            <Input.Label>Generate Data</Input.Label>
          </Input.Root>
      </div>
      <MarkdownEditor model={model} />
    </main>
  );
};

export const WithYjs = {
  // TODO(wittjosiah): Decorator for doing this without clients being initialized?
  render: () => <ClientRepeater count={2} Component={Story} />,
};
