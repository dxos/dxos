//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type KeyboardEvent, useState } from 'react';

import { type Button, IconButton, Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { editorWidth, join } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

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
    <div className='flex w-full justify-center'>
      <div
        className={mx(
          'flex w-full p-2 gap-2 items-center bg-modal-surface border border-separator rounded-md',
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
          classNames='px-0'
          onClick={() => onAction({ type: 'cancel' })}
        />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/CommandDialog',
  render: () => <EditorStory text={join('# Command', '', '')} extensions={[]} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
