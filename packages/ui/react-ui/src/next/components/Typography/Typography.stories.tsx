//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect } from 'storybook/test';

import { random } from '@dxos/random';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Block from '../Block/Block.tsx';
import * as Container from '../Container/Container.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as Typography from './Typography.tsx';

random.seed(123);

const TEXT = random.lorem.paragraph();

const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Container.Container>
      <Block.Block rail='start' data-testid={`icon-${size}`}>
        <Icon.Icon icon='ph--chat-circle--regular' />
      </Block.Block>
      <Typography.Typography data-testid={`text-${size}`}>{TEXT}</Typography.Typography>
    </Container.Container>
    <Container.Container layout='row' columns='minmax(0, 1fr) auto'>
      <Typography.Typography truncate data-testid={`truncate-${size}`}>
        {TEXT}
      </Typography.Typography>
      <Typography.Typography tone='muted' data-testid={`description-${size}`}>
        Description
      </Typography.Typography>
    </Container.Container>
    <Container.Container>
      <Typography.Typography lines={2} data-testid={`lines-${size}`}>
        {TEXT} {TEXT}
      </Typography.Typography>
      <Typography.Typography tone='subtle' data-testid={`subdued-${size}`}>
        Subdued interface text
      </Typography.Typography>
      <Typography.Typography mono data-testid={`mono-${size}`}>
        did:key:z6Mk
      </Typography.Typography>
    </Container.Container>
    <Container.Container>
      <Typography.Typography asChild>
        <h2 className='font-medium' data-testid={`heading-${size}`}>
          Typography as a heading
        </h2>
      </Typography.Typography>
    </Container.Container>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Typography',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Wrapped text keeps its first line centred in a block, so the rail icon beside it lines up at every size. `truncate`
 * keeps one block-tall line ending in an ellipsis; `lines` clamps to that many lines; `tone='muted'` and
 * `tone='subtle'` take the secondary and interface text colours; `mono` the monospace font.
 */
export const Test: Story = {
  args: { allSizes: true },
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

    for (const size of SIZES) {
      const truncated = byTestId(canvasElement, `truncate-${size}`);
      await expect(truncated.getBoundingClientRect().height, size).toBeCloseTo(GEOMETRY[size].block, 0);
      await expect(truncated.scrollWidth, size).toBeGreaterThan(truncated.clientWidth);
      await expect(getComputedStyle(truncated).textOverflow).toBe('ellipsis');
      const description = byTestId(canvasElement, `description-${size}`);
      await expect(getComputedStyle(description).color).not.toBe(getComputedStyle(truncated).color);
      // The row keeps both columns inside the content track, clear of the end rail.
      await expect(description.getBoundingClientRect().right, size).toBeLessThanOrEqual(
        sizeRow(canvasElement, size).getBoundingClientRect().right - GEOMETRY[size].block + 0.5,
      );
    }

    for (const size of SIZES) {
      const clamped = byTestId(canvasElement, `lines-${size}`);
      const style = getComputedStyle(clamped);
      const contentHeight = clamped.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      await expect(contentHeight, size).toBeCloseTo(2 * parseFloat(style.lineHeight), 0);
    }
    const plain = getComputedStyle(byTestId(canvasElement, 'text-md'));
    const subdued = getComputedStyle(byTestId(canvasElement, 'subdued-md'));
    await expect(subdued.color).not.toBe(plain.color);
    await expect(subdued.color).not.toBe(getComputedStyle(byTestId(canvasElement, 'description-md')).color);
    await expect(getComputedStyle(byTestId(canvasElement, 'mono-md')).fontFamily).toMatch(/mono/i);

    // `asChild` moves the metrics onto the heading itself.
    const heading = byTestId(canvasElement, 'heading-md');
    await expect(heading.tagName).toBe('H2');
    await expect(heading).toHaveAttribute('data-scope', 'typography');
    await expectScoped(canvasElement);
  },
};
