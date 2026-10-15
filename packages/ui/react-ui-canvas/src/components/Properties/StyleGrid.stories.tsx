//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { STYLE_SET_IDS, defaultThemeRegistry, resolveLook, styleVariant } from '../../model/style-set.ts';
import { type NodeTone, type StyleHue } from '../../model/types.ts';
import { StyleGrid, type StyleGridProps } from './StyleGrid.tsx';

type StoryArgs = Pick<StyleGridProps, 'indeterminate' | 'readonly'> & { styleSet: string };

/** The grid alone, holding its own pick: each swatch is a hue in one of the style set's variants, as a node draws it. */
const DefaultStory = ({ indeterminate, readonly, styleSet }: StoryArgs) => {
  const [hue, setHue] = useState<StyleHue>('blue');
  const [tone, setTone] = useState<NodeTone>(2);
  const look = useMemo(() => resolveLook(defaultThemeRegistry, { styleSet }), [styleSet]);
  return (
    <div className='grid grid-cols-2 gap-4 w-[48rem]'>
      <StyleGrid
        look={look}
        hue={hue}
        tone={tone}
        indeterminate={indeterminate}
        readonly={readonly}
        onValueChange={(choice) => {
          setHue(choice.hue);
          setTone(choice.tone);
        }}
      />
      <JsonHighlighter data={{ hue, tone, variant: styleVariant(look.styleSet, tone).name }} />
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
    styleSet: 'flat',
  },
  argTypes: { styleSet: { control: 'inline-radio', options: STYLE_SET_IDS } },
};

export default meta;

export const Default: StoryObj<StoryArgs> = {};

/** Glass's four variants: clear, frost, tint and solid. */
export const Glass: StoryObj<StoryArgs> = { args: { styleSet: 'glass' } };

/** Flat's three variants: subtle, muted and solid. */
export const Flat: StoryObj<StoryArgs> = { args: { styleSet: 'flat' } };

/** Outline's three variants: hairline, bold and dashed. */
export const Outline: StoryObj<StoryArgs> = { args: { styleSet: 'outline' } };
