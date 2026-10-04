//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { hues } from '@dxos/ui-types';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { type Size, SIZES } from '../../sizes.ts';
import { byTestId, centreY, controlSize, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Button, Container, Group, Tag, type TagHue } from '../index.ts';

/** Label text (one step below the body) per size, in px. */
const LABEL_FONT: Record<Size, number> = { xs: 12, sm: 12, md: 14, lg: 16, xl: 18 };

const VALENCES: TagHue[] = ['neutral', 'info', 'success', 'warning', 'error'];

/** Clickable, deletable, and clickable and deletable tags, counting their clicks and restoring deleted ones. */
const InteractiveTags = ({ size }: { size?: Size }) => {
  const [clicks, setClicks] = useState(0);
  const [deleted, setDeleted] = useState<string[]>([]);
  const remove = (name: string) => () => setDeleted((current) => [...current, name]);
  const shown = (name: string) => !deleted.includes(name);
  return (
    <Container layout='row' data-testid={`interactive-${size}`}>
      <Group>
        <Tag hue='sky' onClick={() => setClicks((count) => count + 1)} data-testid={`clickable-${size}`}>
          Filter
        </Tag>
        {shown('design') && (
          <Tag hue='violet' onDelete={remove('design')} data-testid={`deletable-${size}`}>
            Design
          </Tag>
        )}
        {shown('bug') && (
          <Tag
            hue='rose'
            onClick={() => setClicks((count) => count + 1)}
            onDelete={remove('bug')}
            data-testid={`both-${size}`}
          >
            Bug
          </Tag>
        )}
        <Button compact onClick={() => setDeleted([])} data-testid={`reset-${size}`}>
          Reset
        </Button>
        <output data-testid={`clicks-${size}`}>{clicks}</output>
      </Group>
    </Container>
  );
};

/** A row of tags centred in a block row, clickable and deletable tags, then every valence and hue. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    <Container layout='row' data-testid={`row-${size}`}>
      <Group>
        <Tag hue='blue' data-testid={`tag-${size}`}>
          Release
        </Tag>
        <Tag hue='amber'>Draft</Tag>
      </Group>
    </Container>
    <InteractiveTags size={size} />
    <Group>
      {[...VALENCES, ...hues].map((hue) => (
        <Tag key={hue} hue={hue} data-testid={`hue-${hue}-${size}`}>
          {hue}
        </Tag>
      ))}
    </Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Tag',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[48rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A tag is one inset shorter than a control on each side, centred in its row, in the size's label text; each hue maps
 * to ui-theme's surface/fg tokens, and valences share the current Tag's hues (error is rose). A plain tag is a span; an
 * `onClick` tag is a button (click and Enter); an `onDelete` tag has a trailing "Remove <text>" button that fits the
 * pill without changing its height and fires only `onDelete`; a clickable tag also deletes on Backspace; no button
 * nests in another.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const tag = byTestId(canvasElement, `tag-${size}`);
      const row = byTestId(canvasElement, `row-${size}`);
      const inset = parseFloat(getComputedStyle(row).getPropertyValue('--dx-control-inset'));
      const rect = tag.getBoundingClientRect();
      await expect(rect.height, size).toBeCloseTo(controlSize(size) - 2 * inset, 0);
      await expect(centreY(rect), size).toBeCloseTo(centreY(row.getBoundingClientRect()), 0);
      await expect(parseFloat(getComputedStyle(tag).fontSize), size).toBe(LABEL_FONT[size]);
    }
    await expectScoped(canvasElement);

    const canvas = within(sizeRow(canvasElement, 'md'));
    const background = (hue: string) => getComputedStyle(byTestId(canvasElement, `hue-${hue}-md`)).backgroundColor;
    const colours = new Set(hues.map(background));
    await expect(colours.size).toBe(hues.length);
    await expect(background('error')).toBe(background('rose'));
    await expect(background('warning')).toBe(background('amber'));
    await expect(background('success')).toBe(background('emerald'));
    await expect(background('info')).toBe(background('cyan'));
    await expect(background('neutral')).not.toBe(background('red'));
    await expect(canvas.getByText('red')).toHaveAttribute('data-hue', 'red');

    // Interactive tags keep the plain tag's height; the × fits inside the pill.
    for (const size of SIZES) {
      const plain = byTestId(canvasElement, `tag-${size}`).getBoundingClientRect();
      for (const testId of [`clickable-${size}`, `deletable-${size}`, `both-${size}`]) {
        const tag = byTestId(canvasElement, testId);
        const rect = tag.getBoundingClientRect();
        await expect(rect.height, testId).toBeCloseTo(plain.height, 0);
        const cross = tag.querySelector<HTMLElement>('[data-part="delete-trigger"]')?.getBoundingClientRect();
        if (cross) {
          await expect(cross.top, `${testId} ×`).toBeGreaterThanOrEqual(rect.top - 0.5);
          await expect(cross.bottom).toBeLessThanOrEqual(rect.bottom + 0.5);
          await expect(cross.right).toBeLessThanOrEqual(rect.right + 0.5);
        }
      }
    }
    await expect(canvasElement.querySelector('button button')).toBeNull();
    await expect(byTestId(canvasElement, 'tag-md').tagName).toBe('SPAN');

    const clicks = byTestId(canvasElement, 'clicks-md');
    const clickable = canvas.getByRole('button', { name: 'Filter' });
    await expect(clickable).toBe(byTestId(canvasElement, 'clickable-md'));
    await userEvent.click(clickable);
    await waitFor(() => expect(clicks).toHaveTextContent('1'));
    clickable.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(clicks).toHaveTextContent('2'));

    // The × fires onDelete only.
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Design' }));
    await waitFor(() => expect(canvas.queryByTestId('deletable-md')).toBeNull());
    await expect(clicks).toHaveTextContent('2');

    // Clicking and deleting a clickable, deletable tag: its text is one button, its × a sibling.
    const bug = canvas.getByRole('button', { name: 'Bug' });
    await expect(bug.closest('[data-part="root"]')).toBe(byTestId(canvasElement, 'both-md'));
    await userEvent.click(bug);
    await waitFor(() => expect(clicks).toHaveTextContent('3'));
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Bug' }));
    await waitFor(() => expect(canvas.queryByTestId('both-md')).toBeNull());
    await expect(clicks).toHaveTextContent('3');

    // Backspace on the focused tag deletes it.
    await userEvent.click(byTestId(canvasElement, 'reset-md'));
    const restored = await canvas.findByRole('button', { name: 'Bug' });
    restored.focus();
    await userEvent.keyboard('{Backspace}');
    await waitFor(() => expect(canvas.queryByTestId('both-md')).toBeNull());
    await expect(clicks).toHaveTextContent('3');
  },
};
