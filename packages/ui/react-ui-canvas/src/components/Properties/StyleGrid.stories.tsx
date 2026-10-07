//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type NodeTone } from '../../model/types.ts';
import { TONE_NAMES } from '../../utils/style.ts';
import { StyleGrid, type StyleGridProps } from './StyleGrid.tsx';

type StoryArgs = Pick<StyleGridProps, 'indeterminate' | 'readonly'>;

/** The grid alone, holding its own pick: each swatch is a hue at a tone, as a node would draw it. */
const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {
  const [hue, setHue] = useState<string>('blue');
  const [tone, setTone] = useState<NodeTone>(2);
  return (
    <div className='w-72 p-2'>
      <StyleGrid
        hue={hue}
        tone={tone}
        indeterminate={indeterminate}
        readonly={readonly}
        onValueChange={(choice) => {
          setHue(choice.hue);
          setTone(choice.tone);
        }}
      />
      <p className='pt-2 text-xs font-mono'>
        {hue} · {TONE_NAMES[tone]}
      </p>
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/scene/StyleGrid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { indeterminate: false, readonly: false },
};

export default meta;

export const Default: StoryObj<StoryArgs> = {};
