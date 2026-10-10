//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Component, type PropsWithChildren, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import * as Input from '../../namespaces/Input.ts';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type StoryArgs = SizeArgs & Pick<Input.SliderProps, 'min' | 'max' | 'step' | 'disabled'>;

/** Renders the error a child throws, so a play test can read an invariant's message without failing the story. */
class Caught extends Component<PropsWithChildren<{ testId: string }>, { message?: string }> {
  override state: { message?: string } = {};

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  override render() {
    return this.state.message !== undefined ? (
      <span data-testid={this.props.testId}>{this.state.message}</span>
    ) : (
      this.props.children
    );
  }
}

const Controlled = (props: Omit<StoryArgs, 'size' | 'allSizes'>) => {
  const [value, setValue] = useState([25]);
  return (
    <>
      <Input.Slider {...props} value={value} onValueChange={setValue} label='Volume' data-testid='controlled' />
      <span data-testid='readout'>{value[0]}</span>
    </>
  );
};

const DefaultStory = ({ size: _size, allSizes: _allSizes, ...props }: StoryArgs) => (
  <>
    <Controlled {...props} />
    <Input.Slider defaultValue={[0.4]} min={0.2} max={0.7} step={0.01} aria-label='Opacity' />
    <Input.Slider defaultValue={[25, 75]} max={100} thumbLabels={['Minimum', 'Maximum']} label='Price' />
    <Input.Slider defaultValue={[50]} max={100} disabled aria-label='Disabled value' />
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Slider',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', min: 0, max: 100, step: 1, disabled: false },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const TestStory = (args: StoryArgs) => (
  <>
    <DefaultStory {...args} />
    {args.size === 'md' && (
      <>
        <Caught testId='partial-labels'>
          <Input.Slider defaultValue={[25, 75]} max={100} thumbLabels={['Minimum']} />
        </Caught>
        <Caught testId='no-labels'>
          <Input.Slider defaultValue={[25, 75]} max={100} aria-label='Range' />
        </Caught>
      </>
    )}
  </>
);

/**
 * Every thumb is visible and named (by `label`, `aria-label` or `thumbLabels`), keys move the value, and a slider whose
 * thumbs cannot all be named throws instead of rendering.
 */
export const Test: Story = {
  render: TestStory,
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    // Thumbs are icon-sized and centred in a block-tall control at every size, and a disabled one is still drawn.
    for (const size of SIZES) {
      const row = sizeRow(canvasElement, size);
      const thumbs = within(row).getAllByRole('slider');
      await expect(thumbs, size).toHaveLength(5);
      const control = row.querySelector<HTMLElement>('[data-scope="slider"][data-part="control"]');
      await expect(control?.getBoundingClientRect().height, size).toBeCloseTo(GEOMETRY[size].block, 0);
      for (const thumb of thumbs) {
        const box = thumb.getBoundingClientRect();
        await expect(box.width, size).toBeCloseTo(GEOMETRY[size].icon, 0);
        await expect(box.height, size).toBeCloseTo(GEOMETRY[size].icon, 0);
        await expect(getComputedStyle(thumb).visibility, size).toBe('visible');
        await expect(thumb.getAttribute('aria-label') ?? thumb.getAttribute('aria-labelledby'), size).toBeTruthy();
      }
    }

    const row = sizeRow(canvasElement, 'md');
    const canvas = within(row);

    // Naming: a visible label, a plain aria-label, and per-thumb names read together with the label.
    const volume = canvas.getByRole('slider', { name: 'Volume' });
    await expect(canvas.getByRole('slider', { name: 'Opacity' })).toHaveAttribute('aria-valuenow', '0.4');
    await expect(canvas.getByRole('slider', { name: 'Minimum Price' })).toHaveAttribute('aria-valuenow', '25');
    await expect(canvas.getByRole('slider', { name: 'Maximum Price' })).toHaveAttribute('aria-valuenow', '75');

    // The range spans the two thumbs of a range slider.
    const price = canvas.getByRole('slider', { name: 'Minimum Price' }).closest<HTMLElement>('[data-part="root"]');
    const track = price?.querySelector<HTMLElement>('[data-part="track"]')?.getBoundingClientRect();
    const range = price?.querySelector<HTMLElement>('[data-part="range"]')?.getBoundingClientRect();
    await expect(range?.width).toBeCloseTo((track?.width ?? 0) / 2, 0);

    // A thumb at either end stays inside the root.
    const root = volume.closest<HTMLElement>('[data-part="root"]')?.getBoundingClientRect();
    await expect(volume.getBoundingClientRect().left).toBeGreaterThanOrEqual((root?.left ?? 0) - 0.5);

    // Keys move a controlled slider through onValueChange.
    volume.focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await waitFor(() => expect(volume).toHaveAttribute('aria-valuenow', '27'));
    await expect(canvas.getByTestId('readout')).toHaveTextContent('27');
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(canvas.getByTestId('readout')).toHaveTextContent('100'));

    // A disabled slider ignores keys.
    const disabled = canvas.getByRole('slider', { name: 'Disabled value' });
    await expect(disabled).toHaveAttribute('aria-disabled', 'true');
    disabled.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(disabled).toHaveAttribute('aria-valuenow', '50');

    // Unnamed thumbs throw, naming what is missing.
    await expect(canvas.getByTestId('partial-labels')).toHaveTextContent(
      'Slider: thumbLabels has 1 entries but 2 thumb(s) are rendered.',
    );
    await expect(canvas.getByTestId('no-labels')).toHaveTextContent(
      'Slider: pass thumbLabels (2 entries) or, for a single thumb, label or aria-label.',
    );
  },
};
