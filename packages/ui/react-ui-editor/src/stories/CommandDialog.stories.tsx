//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type KeyboardEvent, useState } from 'react';

import { type Button, IconButton, Input } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/react-ui-theme';

import { editorWidth } from '../defaults';
import { str } from '../testing';

import { EditorStory } from './components';

// TODO(burdon): Reimplement with Popover.
const CommandDialog = ({ onAction }: { onAction: (action?: any) => void }) => {
  const [text, setText] = useState('');

  const handleInsert = () => {
    // TODO(burdon): Use queue ref.
    const link = `![${text}](dxn:queue:data:123)`;
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
    <div className='flex is-full justify-center'>
      <div
        className={mx(
          'flex is-full p-2 gap-2 items-center bg-modalSurface border border-separator rounded-md',
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
        <IconButton
          icon='ph--x--regular'
          label='Cancel'
          iconOnly
          variant='ghost'
          classNames='pli-0'
          onClick={() => onAction({ type: 'cancel' })}
        />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/CommandDialog',
  render: () => <EditorStory text={str('# Command', '', '')} extensions={[]} />,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
