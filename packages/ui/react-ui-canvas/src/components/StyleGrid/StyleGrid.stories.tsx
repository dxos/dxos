//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import {
  type NodeTone,
  type StyleHue,
  THEME_IDS,
  defaultThemeRegistry,
  resolveLook,
  styleVariant,
} from '../../model/index.ts';
import { DisplayPanel } from '../panels/index.ts';
import { StyleGrid, type StyleGridProps } from './StyleGrid.tsx';

type StoryArgs = Pick<StyleGridProps, 'indeterminate' | 'readonly'> & { theme?: string };

/**
 * The grid alone, holding its own pick: each swatch is a hue in one of the style set's variants, as a node draws it.
 * The theme bar picks the theme whose style set it draws; the `theme` arg is where it starts.
 */
const DefaultStory = ({ indeterminate, readonly, theme: initialTheme }: StoryArgs) => {
  const [hue, setHue] = useState<StyleHue>('blue');
  const [tone, setTone] = useState<NodeTone>(2);
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => setTheme(initialTheme), [initialTheme]);
  const look = useMemo(() => resolveLook(defaultThemeRegistry, { theme }), [theme]);
  return (
    <div className='grid grid-cols-2 gap-4 w-[48rem]'>
      <div className='flex flex-col gap-2'>
        <DisplayPanel
          registry={defaultThemeRegistry}
          theme={look.theme}
          override={theme}
          grid={look.background.grid}
          themeGrid={look.background.grid}
          onThemeChange={setTheme}
        />
        <div className='p-2'>
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
        </div>
      </div>
      <JsonHighlighter data={{ hue, tone, variant: styleVariant(look.styleSet, tone).name }} />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/StyleGrid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  args: {
    indeterminate: false,
    readonly: false,
    theme: 'flat',
  },
  argTypes: { theme: { control: 'inline-radio', options: THEME_IDS } },
};

export default meta;

export const Default: StoryObj<StoryArgs> = {};

/** Glass's four variants: clear, frost, tint and solid. */
export const Glass: StoryObj<StoryArgs> = { args: { theme: 'glass-night' } };

/** Flat's four variants: clear, subtle, muted and solid. */
export const Flat: StoryObj<StoryArgs> = { args: { theme: 'flat' } };

/** Outline's three variants: hairline, bold and dashed. */
export const Outline: StoryObj<StoryArgs> = { args: { theme: 'outline' } };
