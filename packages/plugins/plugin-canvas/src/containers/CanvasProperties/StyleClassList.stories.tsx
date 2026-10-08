//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type StyleClass } from '@dxos/react-ui-canvas/scene';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { StyleClassList } from './StyleClassList.tsx';

const CLASSES: StyleClass[] = [
  { id: 'warn', name: 'Warning', style: { hue: 'red' } },
  { id: 'ok', name: 'Done', style: { hue: 'green', tone: 3 } },
  { id: 'flow', name: 'Flow', line: { hue: 'blue', dash: 'dashed' } },
];

const DefaultStory = () => {
  const [classes, setClasses] = useState(CLASSES);
  return (
    <div className='w-80'>
      <StyleClassList
        classes={classes}
        uses={{ warn: 3, ok: 1 }}
        onRename={(id, name) =>
          setClasses((classes) =>
            classes.map((styleClass) => (styleClass.id === id ? { ...styleClass, name } : styleClass)),
          )
        }
        onDelete={(id) => setClasses((classes) => classes.filter((styleClass) => styleClass.id !== id))}
      />
    </div>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-canvas/containers/StyleClassList',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
