//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { SIZES } from '../../sizes.ts';
import { byTestId, centreY, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button } from '../Button/Button.tsx';
import { Group } from '../Group/Group.tsx';
import * as Typography from '../Typography/Typography.tsx';
import { Separator } from './Separator.tsx';

/** A horizontal rule between two paragraphs, then a vertical rule and a decorative one between buttons. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Typography.Text data-testid={`above-${size}`}>Above</Typography.Text>
    <Separator data-testid={`horizontal-${size}`} />
    <Typography.Text>Below</Typography.Text>
    <Group data-testid={`group-${size}`}>
      <Button data-testid={`left-${size}`}>Left</Button>
      <Separator orientation='vertical' data-testid={`vertical-${size}`} />
      <Button>Middle</Button>
      <Separator orientation='vertical' decorative data-testid={`decorative-${size}`} />
      <Button>Right</Button>
    </Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Separator',
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
 * A horizontal separator is a 1px rule across the content track; a vertical one is 1px wide, control-tall and centred
 * beside the controls it separates. Both are painted in the separator colour and claim `role=separator` (vertical
 * spelling out its orientation), unless `decorative`, which hides the rule from assistive tech.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const horizontal = byTestId(canvasElement, `horizontal-${size}`);
      const rect = horizontal.getBoundingClientRect();
      await expect(rect.height, `horizontal-${size} height`).toBeCloseTo(1, 0);
      await expect(rect.width, `horizontal-${size} width`).toBeCloseTo(
        byTestId(canvasElement, `above-${size}`).getBoundingClientRect().width,
        0,
      );
      await expect(getComputedStyle(horizontal).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

      const vertical = byTestId(canvasElement, `vertical-${size}`).getBoundingClientRect();
      await expect(vertical.width, `vertical-${size} width`).toBeCloseTo(1, 0);
      await expect(vertical.height, `vertical-${size} height`).toBeCloseTo(controlSize(size), 0);
      const left = byTestId(canvasElement, `left-${size}`).getBoundingClientRect();
      await expect(centreY(vertical), `vertical-${size} centre`).toBeCloseTo(centreY(left), 0);
    }

    const md = within(sizeRow(canvasElement, 'md'));
    const separators = md.getAllByRole('separator');
    await expect(separators).toHaveLength(2);
    await expect(separators[0]).toBe(byTestId(canvasElement, 'horizontal-md'));
    await expect(separators[0]).not.toHaveAttribute('aria-orientation');
    await expect(separators[1]).toHaveAttribute('aria-orientation', 'vertical');
    const decorative = byTestId(canvasElement, 'decorative-md');
    await expect(decorative).toHaveAttribute('role', 'none');
    await expect(decorative).toHaveAttribute('aria-hidden', 'true');
    await expectScoped(canvasElement);
  },
};
