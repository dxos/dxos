//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useEffect, useReducer, useState } from 'react';

import { PublicKey, Text } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';
import { ClientSpaceDecorator, loremGenerator, useDataGenerator } from '@dxos/react-client/testing';
import { Button, Checkbox, CheckboxProps, mx, useId } from '@dxos/react-components';

import { ComposerDocument, schema } from '../../testing';
import { RichTextComposer, RichTextComposerProps } from './RichText';

export default {
  component: RichTextComposer
};

const Story = ({
  spaceKey,
  id,
  ...args
}: Omit<RichTextComposerProps, 'text'> & { spaceKey?: PublicKey; id: number }) => {
  // TODO(wittjosiah): Text being created isn't firing react updates.
  const [, forceUpdate] = useReducer((state) => state + 1, 0);
  const [generate, setGenerate] = useState<CheckboxProps['defaultChecked']>(false);

  const space = useSpace(spaceKey);
  // TODO(burdon): Update on mutation?
  const [document] = useQuery(space, ComposerDocument.filter());
  useEffect(() => {
    if (space && id === 0) {
      setTimeout(async () => {
        // TODO(burdon): Auto-create document.
        const document = new ComposerDocument({ content: new Text() });
        await space?.db.add(document);
      });
    }
  }, [space]);

  useDataGenerator({
    generator: loremGenerator,
    space: generate ? space : undefined,
    options: {
      mode: 'random',
      characterInterval: 500
    }
  });

  const generateId = useId('generate');

  if (!document?.content) {
    return <Button onClick={() => forceUpdate()}>Update</Button>;
  }

  return (
    <main className='flex-1 min-w-0 p-4'>
      <div id={generateId} className='flex'>
        <Checkbox labelId={generateId} onCheckedChange={setGenerate} />
        Generate Data
      </div>
      <RichTextComposer
        {...args}
        text={document.content}
        space={space}
        slots={{
          editor: {
            className: mx(
              'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]',
              args.slots?.editor?.className
            )
          }
        }}
      />
    </main>
  );
};

export const Default = {
  render: Story,
  decorators: [ClientSpaceDecorator({ schema, count: 2 })]
};
