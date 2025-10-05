//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { CellEditor, type CellEditorProps, type EditorKeyEvent, editorKeys } from './CellEditor';

const DefaultStory = (props: CellEditorProps) => {
  const [value, setValue] = useState(props.value || 'Edit me');
  const [lastAction, setLastAction] = useState<string>('');

  const handleBlur = (newValue?: string) => {
    if (newValue !== undefined) {
      setValue(newValue);
      setLastAction(`Blur: ${newValue}`);
    }
  };

  const handleKeyEvent = (newValue: string | undefined, event: EditorKeyEvent) => {
    if (newValue !== undefined) {
      setValue(newValue);
      setLastAction(`Key: ${event.key}${event.shift ? ' + Shift' : ''}, Value: ${newValue}`);
    } else {
      setLastAction(`Key: ${event.key}${event.shift ? ' + Shift' : ''}, Cancelled`);
    }
  };

  // Create an extension with editor keys
  const extensions = props.extensions || [
    editorKeys({
      onClose: handleKeyEvent,
      onNav: (value, event) => {
        setLastAction(`Navigation: ${event.key}, Value: ${value}`);
      },
    }),
  ];

  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='text-sm'>
        Current value: <span className='font-mono'>{value}</span>
      </div>
      <div className='text-sm'>
        Last action: <span className='font-mono'>{lastAction}</span>
      </div>
      <div className='relative border border-separator h-[100px] w-[300px]'>
        <CellEditor
          value={value}
          extensions={extensions}
          autoFocus={props.autoFocus}
          onBlur={handleBlur}
          box={{
            insetInlineStart: 10,
            insetBlockStart: 10,
            inlineSize: 280,
            blockSize: 30,
          }}
          gridId='demo-grid'
        />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-grid/CellEditor',
  component: CellEditor,
  render: DefaultStory,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof CellEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 'Edit me',
    autoFocus: true,
  },
};
