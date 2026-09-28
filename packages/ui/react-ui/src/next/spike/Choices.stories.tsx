//
// Copyright 2026 DXOS.org
//

import '../theme/index.css';
import './choices.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing/index.ts';
import { Next } from '../Next.tsx';
import { SIZES } from '../sizes.ts';

const { Block, Container } = Next;

const LABEL_COLUMNS = 'auto [field-start] minmax(0, 1fr)';

const CONTROL_OPTIONS = [
  { id: 'step', title: '1. One step down the scale' },
  { id: 'inset', title: '2. Fixed inset per size' },
  { id: 'content', title: '3. Sized by content' },
] as const;

/** A row per size: rail icon, input, icon button and button; the dashed box is the block. */
const ControlSizingStory = () => (
  <div className='nx-scope grid grid-cols-3 gap-4' data-size='md' data-debug=''>
    {CONTROL_OPTIONS.map(({ id, title }) => (
      <div key={id} data-control={id} className='flex flex-col gap-1 border border-separator p-2'>
        <h2 className='font-medium'>{title}</h2>
        {SIZES.map((size) => (
          <Container key={size} size={size} gutter='rail' layout='row'>
            <Block rail='start'>
              <Next.Icon icon='ph--circle--regular' />
            </Block>
            <div className='nx-demo-group'>
              <input className='nx-demo-control grow min-w-0 bg-input-bg' placeholder={size} aria-label={size} />
              <button type='button' className='nx-demo-control bg-input-bg' data-square='' aria-label='Add'>
                <Next.Icon icon='ph--plus--regular' />
              </button>
              <button type='button' className='nx-demo-control bg-input-bg'>
                Save
              </button>
            </div>
          </Container>
        ))}
      </div>
    ))}
  </div>
);

const FIELD_OPTIONS = [
  { id: 'contents', title: '1. display: contents', className: 'nx-field-contents' },
  { id: 'row', title: '2. Subgrid row', className: 'nx-field-row' },
  { id: 'stack', title: '3. Flex stack', className: 'nx-field-stack' },
] as const;

/** The same form in each layout; hover a field to see which layouts have a box for row states. */
const FieldLayoutStory = () => (
  <div className='nx-scope grid grid-cols-3 gap-4' data-size='md'>
    {FIELD_OPTIONS.map(({ id, title, className }) => (
      <div key={id} className='flex flex-col gap-1 border border-separator p-2'>
        <h2 className='font-medium'>{title}</h2>
        <Container gutter='rail' columns={LABEL_COLUMNS}>
          <div className={`${className} hover:bg-hover-surface`}>
            <label data-part='label' htmlFor={`${id}-name`}>
              Name
            </label>
            <Next.Input id={`${id}-name`} />
          </div>
          <div className={`${className} hover:bg-hover-surface`}>
            <label data-part='label' htmlFor={`${id}-email`}>
              Email address
            </label>
            <Next.Input id={`${id}-email`} aria-invalid='true' aria-describedby={`${id}-email-error`} />
            <span id={`${id}-email-error`} className='text-sm text-rose-500'>
              Enter a valid address.
            </span>
          </div>
        </Container>
      </div>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/choices',
  decorators: [withTheme()],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ControlSizing: Story = {
  render: ControlSizingStory,
};

export const FieldLayout: Story = {
  render: FieldLayoutStory,
};
