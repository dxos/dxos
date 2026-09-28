//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, sizeRow } from '../../testing.ts';

/** Every preset in a Toolbar row, plus a plain icon-only Button whose geometry the presets must match. */
const DefaultStory = ({ size }: SizeArgs) => {
  const [recording, setRecording] = useState(false);
  return (
    <Next.Toolbar.Root>
      <Next.SystemButton.Disclosure data-testid={`disclosure-${size}`} />
      <Next.SystemButton.Star data-testid={`star-${size}`} />
      <Next.SystemButton.Bookmark data-testid={`bookmark-${size}`} />
      <Next.SystemButton.Clipboard value={`Copied at ${size}`} data-testid={`clipboard-${size}`} />
      <Next.Toolbar.Separator />
      <Next.SystemButton.Mic
        label={recording ? 'Stop recording' : 'Start recording'}
        recording={recording}
        onToggle={() => setRecording((value) => !value)}
      />
      <Next.SystemButton.Upload accept='*/*' />
      <Next.SystemButton.Download filename='example.txt' onDownload={() => new Blob(['Hello from SystemButton'])} />
      <Next.Toolbar.Separator />
      <Next.SystemButton.Ai />
      <Next.SystemButton.Add />
      <Next.SystemButton.Edit />
      <Next.SystemButton.Delete />
      <Next.SystemButton.Close />
      <Next.Toolbar.Separator />
      <Next.Button iconOnly icon='ph--plus--regular' label={`Reference ${size}`} data-testid={`reference-${size}`} />
    </Next.Toolbar.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/SystemButton',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[40rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The icon's sprite reference, which resolves once the sprite registry has the icon. */
const iconHref = (button: HTMLElement) => button.querySelector('use')?.getAttribute('href') ?? '';

/**
 * Every preset is an icon-only button named by its translated label and sized like a plain `Button iconOnly`; Star and
 * Bookmark are toggles that swap icon and label; Disclosure reports `aria-expanded` (not `aria-pressed`); Clipboard
 * writes its value and confirms with a check and a "Copied" label.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const reference = byTestId(canvasElement, `reference-${size}`).getBoundingClientRect();
      for (const preset of ['disclosure', 'star', 'bookmark', 'clipboard']) {
        const rect = byTestId(canvasElement, `${preset}-${size}`).getBoundingClientRect();
        await expect(rect.width, `${preset} ${size}`).toBeCloseTo(reference.width, 0);
        await expect(rect.height, `${preset} ${size}`).toBeCloseTo(reference.height, 0);
      }
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    const names = [
      'Expand',
      'Star',
      'Bookmark',
      'Copy',
      'Start recording',
      'Upload',
      'Download',
      'Run AI',
      'Add',
      'Edit',
      'Delete',
      'Close',
    ];
    for (const name of names) {
      const button = await canvas.findByRole('button', { name }, { timeout: 10_000 });
      await expect(button, name).toHaveAttribute('data-square');
      await expect(button.querySelector('svg'), name).not.toBeNull();
    }

    const star = byTestId(sizeRow(canvasElement, 'md'), 'star-md');
    await expect(star).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(iconHref(star)).toContain('ph--star--regular'));
    await userEvent.click(star);
    await waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() => expect(iconHref(star)).toContain('ph--star--fill'));
    await expect(star).toHaveAccessibleName('Unstar');
    await expect(star).toHaveAttribute('data-icon-valence', 'warning');
    await expect(star).not.toHaveAttribute('aria-expanded');

    const bookmark = byTestId(sizeRow(canvasElement, 'md'), 'bookmark-md');
    await userEvent.click(bookmark);
    await waitFor(() => expect(bookmark).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() => expect(iconHref(bookmark)).toContain('ph--bookmark-simple--fill'));
    await expect(bookmark).toHaveAccessibleName('Remove bookmark');
    await userEvent.click(bookmark);
    await waitFor(() => expect(bookmark).toHaveAttribute('aria-pressed', 'false'));
    await expect(bookmark).toHaveAccessibleName('Bookmark');

    const disclosure = byTestId(sizeRow(canvasElement, 'md'), 'disclosure-md');
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(disclosure).not.toHaveAttribute('aria-pressed');
    await userEvent.click(disclosure);
    await waitFor(() => expect(disclosure).toHaveAttribute('aria-expanded', 'true'));
    await expect(disclosure).toHaveAccessibleName('Collapse');
    await waitFor(() => expect(iconHref(disclosure)).toContain('ph--caret-down--regular'));

    const mic = canvas.getByRole('button', { name: 'Start recording' });
    await userEvent.click(mic);
    await waitFor(() => expect(mic).toHaveAccessibleName('Stop recording'));
    await expect(mic).toHaveAttribute('data-hue', 'error');

    // The stub keeps the test off the real clipboard, which rejects writes from an unfocused test document.
    const written: string[] = [];
    const clipboard = navigator.clipboard;
    const writeText = clipboard.writeText;
    Object.defineProperty(clipboard, 'writeText', {
      configurable: true,
      value: async (text: string) => {
        written.push(text);
      },
    });
    try {
      const copy = byTestId(sizeRow(canvasElement, 'md'), 'clipboard-md');
      await userEvent.click(copy);
      await waitFor(() => expect(written).toEqual(['Copied at md']));
      await waitFor(() => expect(copy).toHaveAccessibleName('Copied'));
      await waitFor(() => expect(iconHref(copy)).toContain('ph--check--regular'));
      await expect(copy).toHaveAttribute('data-icon-valence', 'success');
      await waitFor(() => expect(copy).toHaveAccessibleName('Copy'), { timeout: 3_000 });
    } finally {
      Object.defineProperty(clipboard, 'writeText', { configurable: true, value: writeText });
    }
  },
};
