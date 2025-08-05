//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { type KeyboardEvent, useState } from 'react';

import { Button, DropdownMenu, Icon, Input } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { RefDropdownMenu } from '../components';
import { editorWidth } from '../defaults';
import { type Action, command, floatingMenu } from '../extensions';
import { str } from '../testing';
import { createRenderer } from '../util';

import { EditorStory } from './components';

const CommandDialog = ({ onAction }: { onAction: (action?: Action) => void }) => {
  const [text, setText] = useState('');

  const handleInsert = () => {
    // TODO(burdon): Use queue ref.
    const link = `[${text}](dxn:queue:data:123)`;
    onAction(text.length ? { type: 'insert', text: link } : undefined);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter': {
        handleInsert();
        break;
      }
      case 'Escape': {
        onAction();
        break;
      }
    }
  };

  return (
    <div className='flex w-full justify-center'>
      <div
        className={mx(
          'flex w-full p-2 gap-2 items-center bg-modalSurface border border-separator rounded-md',
          editorWidth,
        )}
      >
        <Input.Root>
          <Input.TextInput
            autoFocus={true}
            placeholder='Ask a question...'
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            onKeyDown={handleKeyDown}
          />
        </Input.Root>
        <Button variant='ghost' classNames='pli-0' onClick={() => onAction({ type: 'cancel' })}>
          <Icon icon='ph--x--regular' size={5} />
        </Button>
      </div>
    </div>
  );
};

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Command',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: () => (
    <RefDropdownMenu.Provider>
      <EditorStory
        text={str('# Command', '', '', '')}
        extensions={[
          floatingMenu(),
          command({
            renderDialog: createRenderer(CommandDialog),
            onHint: () => "Press '/' for commands",
          }),
        ]}
      />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenu.Item onClick={() => console.log('!')}>Test</DropdownMenu.Item>
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </RefDropdownMenu.Provider>
  ),
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {};
