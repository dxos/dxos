//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Avatar, type AvatarRootProps } from '../index.ts';

/** Inline SVG, so the stories never fetch from the network. */
const PORTRAIT = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>
    <rect width='64' height='64' fill='#38bdf8'/><circle cx='32' cy='26' r='12' fill='#fde68a'/>
    <path d='M8 64 Q32 30 56 64 Z' fill='#1e293b'/>
  </svg>`,
)}`;

type StoryArgs = SizeArgs & Pick<AvatarRootProps, 'variant' | 'status' | 'hue' | 'hueVariant' | 'fallback'>;

/** Initials, an emoji, an icon, an image and a portrait filling its host, in a row with a visible name. */
const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: StoryArgs) => (
  <div className='flex items-center gap-2'>
    <Avatar.Root
      {...{ variant, status, hue, hueVariant, fallback }}
      aria-labelledby={`name-${size}`}
      data-testid={`initials-${size}`}
    />
    <span id={`name-${size}`}>{fallback}</span>
    <Avatar.Root fallback='🦊' hue='amber' variant={variant} label='Fox' data-testid={`emoji-${size}`} />
    <Avatar.Root icon='ph--robot--regular' hue='violet' hueVariant='surface' label='Agent' />
    <Avatar.Root src={PORTRAIT} fallback='Pat Lee' status='active' label='Pat Lee' data-testid={`image-${size}`} />
    <div className='w-20 shrink-0'>
      <Avatar.Root src={PORTRAIT} fill variant='square' label='Portrait' data-testid={`fill-${size}`} />
    </div>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/Avatar',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', variant: 'circle', status: 'current', hue: 'blue', hueVariant: 'fill', fallback: 'Ada Lovelace' },
  argTypes: {
    ...SIZE_ARG_TYPES,
    variant: { control: 'inline-radio', options: ['circle', 'square'] },
    status: {
      control: 'select',
      options: [undefined, 'active', 'inactive', 'current', 'internal', 'error', 'warning'],
    },
    hueVariant: { control: 'inline-radio', options: ['fill', 'surface', 'transparent'] },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Each avatar is one block across at every size; the fallback shows initials until an image loads. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = sizeRow(canvasElement, size);
      const canvas = within(row);
      const initials = canvas.getByTestId(`initials-${size}`);
      const rect = initials.getBoundingClientRect();
      await expect(rect.width).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect(rect.height).toBeCloseTo(GEOMETRY[size].block, 0);

      // Named by the visible text beside it; the fallback shows the name's initials.
      await expect(canvas.getByRole('img', { name: 'Ada Lovelace' })).toBe(initials);
      await expect(initials).toHaveTextContent('AL');
      await expect(canvas.getByTestId(`emoji-${size}`)).toHaveTextContent('🦊');

      // The hue fills the frame and the status draws a ring.
      await expect(getComputedStyle(initials).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      await expect(getComputedStyle(initials, '::after').boxShadow).not.toBe('none');

      // Once the image loads the fallback is hidden.
      const image = canvas.getByTestId(`image-${size}`);
      await waitFor(() => expect(image.querySelector('[data-part="image"]')).toHaveAttribute('data-state', 'visible'));
      const fallback = image.querySelector<HTMLElement>('[data-part="fallback"]');
      await waitFor(() => expect(fallback).not.toBeVisible());

      // A filled avatar takes its host's width as a square.
      const fill = canvas.getByTestId(`fill-${size}`).getBoundingClientRect();
      await expect(fill.width).toBeCloseTo(80, 0);
      await expect(fill.height).toBeCloseTo(80, 0);
    }
  },
};
