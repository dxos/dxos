//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { byTestId, centreY, expectScoped } from '../../testing.ts';

random.seed(123);

const TEXT = random.lorem.paragraph();

const DefaultStory = () => (
  <div className='nx-scope @container w-[28rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail'>
      {SIZES.map((size) => (
        <Next.Container key={size} size={size}>
          <Next.Block rail='start' data-testid={`icon-${size}`}>
            <Next.Icon icon='ph--chat-circle--regular' />
          </Next.Block>
          <Next.Typography data-testid={`text-${size}`}>{TEXT}</Next.Typography>
        </Next.Container>
      ))}
      <Next.Container>
        <Next.Typography asChild>
          <h2 className='font-medium' data-testid='heading'>
            Typography as a heading
          </h2>
        </Next.Typography>
      </Next.Container>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/typography',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Wrapped text keeps its first line centred in a block, so the rail icon beside it lines up at every size. */
export const FirstLine: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const icon = byTestId(canvasElement, `icon-${size}`).getBoundingClientRect();
      const element = byTestId(canvasElement, `text-${size}`);
      const text = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      await expect(text.height, size).toBeGreaterThan(parseFloat(style.lineHeight) * 2);
      const firstLine = text.top + parseFloat(style.paddingTop) + parseFloat(style.lineHeight) / 2;
      await expect(centreY(icon), size).toBeCloseTo(firstLine, 0);
    }

    // `asChild` moves the metrics onto the heading itself.
    const heading = byTestId(canvasElement, 'heading');
    await expect(heading.tagName).toBe('H2');
    await expect(heading).toHaveAttribute('data-scope', 'typography');
    await expectScoped(canvasElement);
  },
};
