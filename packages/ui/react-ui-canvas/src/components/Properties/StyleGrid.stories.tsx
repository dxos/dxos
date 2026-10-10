//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type NodeTone, type StyleHue } from '../../model/types.ts';
import { TONE_NAMES } from '../../utils/style.ts';
import { StyleGrid, type StyleGridProps } from './StyleGrid.tsx';

type StoryArgs = Pick<StyleGridProps, 'indeterminate' | 'readonly'>;

/** The grid alone, holding its own pick: each swatch is a hue at a tone, as a node would draw it. */
const DefaultStory = ({ indeterminate, readonly }: StoryArgs) => {
  const [hue, setHue] = useState<StyleHue>('blue');
  const [tone, setTone] = useState<NodeTone>(2);
  return (
    <div className='grid grid-cols-2 gap-4 w-[48rem]'>
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
      <JsonHighlighter data={{ hue, tone, name: TONE_NAMES[tone] }} />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/StyleGrid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  args: {
    indeterminate: false,
    readonly: false,
  },
};

export default meta;

export const Default: StoryObj<StoryArgs> = {};
