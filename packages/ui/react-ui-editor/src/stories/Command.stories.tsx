//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useState, type KeyboardEvent } from 'react';

import { Button, Icon, IconButton, Input } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { withLayout, withTheme, type Meta } from '@dxos/storybook-utils';

import { EditorStory } from './util';
import { editorWidth } from '../defaults';
import { command, type Action } from '../extensions';
import { str } from '../testing';
import { createRenderer } from '../util';

const meta: Meta<typeof EditorStory> = {
  title: 'ui/react-ui-editor/Command',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: () => (
    <EditorStory
      text={str('# Command', '', '', '')}
      extensions={[
        command({
          height: 32,
          renderMenu: createRenderer(CommandMenu),
          renderDialog: createRenderer(CommandDialog),
          onHint: () => 'Press / for commands.',
        }),
      ]}
    />
  ),
  parameters: { layout: 'fullscreen' },
};

export default meta;

export const Default = {};

// TODO(burdon): Actual menu.
const CommandMenu = ({ onAction }: { onAction: () => void }) => {
  return (
    <IconButton
      icon='ph--sparkle--regular'
      label='menu'
      size={4}
      iconOnly
      classNames='p-0 aspect-square'
      onClick={onAction}
    />
  );
};

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
