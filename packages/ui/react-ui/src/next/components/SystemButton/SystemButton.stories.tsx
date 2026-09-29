//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { translations } from '#translations';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size, SIZES } from '../../sizes.ts';
import {
  byTestId,
  controlSize,
  expectNoTooltip,
  expectTooltip,
  realHover,
  realUnhover,
  sizeRow,
} from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type PresetProps = { 'iconOnly': boolean; 'data-testid': string };

/** Each preset once per form, keyed for the Test: `<preset>-<size>` icon-only, `<preset>-labelled-<size>` labelled. */
const PRESETS: { id: string; render: (props: PresetProps, size?: Size) => ReactNode }[] = [
  { id: 'disclosure', render: (props) => <Next.SystemButton.Disclosure {...props} /> },
  { id: 'star', render: (props) => <Next.SystemButton.Star {...props} /> },
  { id: 'bookmark', render: (props) => <Next.SystemButton.Bookmark {...props} /> },
  { id: 'clipboard', render: (props, size) => <Next.SystemButton.Clipboard {...props} value={`Copied at ${size}`} /> },
  { id: 'mic', render: (props) => <MicPreset {...props} /> },
  { id: 'upload', render: (props) => <Next.SystemButton.Upload {...props} accept='*/*' /> },
  {
    id: 'download',
    render: (props) => (
      <Next.SystemButton.Download
        {...props}
        filename='example.txt'
        onDownload={() => new Blob(['Hello from SystemButton'])}
      />
    ),
  },
  { id: 'ai', render: (props) => <Next.SystemButton.Ai {...props} /> },
  { id: 'add', render: (props) => <Next.SystemButton.Add {...props} /> },
  { id: 'edit', render: (props) => <Next.SystemButton.Edit {...props} /> },
  { id: 'delete', render: (props) => <Next.SystemButton.Delete {...props} /> },
  { id: 'close', render: (props) => <Next.SystemButton.Close {...props} /> },
  { id: 'save', render: (props) => <Next.SystemButton.Save {...props} /> },
  { id: 'cancel', render: (props) => <Next.SystemButton.Cancel {...props} /> },
];

/** Mic has no translated label: the caller's recording state names it. */
const MicPreset = (props: PresetProps) => {
  const [recording, setRecording] = useState(false);
  return (
    <Next.SystemButton.Mic
      {...props}
      label={recording ? 'Stop recording' : 'Start recording'}
      recording={recording}
      onToggle={() => setRecording((value) => !value)}
    />
  );
};

/** One row per preset, icon-only then labelled (`iconOnly={false}`). */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    {PRESETS.map(({ id, render }) => (
      <Next.Group key={id} data-testid={`row-${id}-${size}`}>
        {render({ 'iconOnly': true, 'data-testid': `${id}-${size}` }, size)}
        {render({ 'iconOnly': false, 'data-testid': `${id}-labelled-${size}` }, size)}
      </Next.Group>
    ))}
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/SystemButton',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[24rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The icon's sprite reference, which resolves once the sprite registry has the icon. */
const iconHref = (button: HTMLElement) => button.querySelector('use')?.getAttribute('href') ?? '';

const NAMES: Record<string, string> = {
  disclosure: 'Open',
  star: 'Star',
  bookmark: 'Bookmark',
  clipboard: 'Copy',
  mic: 'Start recording',
  upload: 'Upload',
  download: 'Download',
  ai: 'Run AI',
  add: 'Add',
  edit: 'Edit',
  delete: 'Delete',
  close: 'Close',
  save: 'Save',
  cancel: 'Cancel',
};

/** The icon's rotation in degrees, from its computed transform matrix (`none` is 0). */
const rotation = (element: Element) => {
  const transform = getComputedStyle(element).transform;
  if (transform === 'none') {
    return 0;
  }
  const [a, b] = transform
    .slice(transform.indexOf('(') + 1, -1)
    .split(',')
    .map(Number);
  return Math.round((Math.atan2(b, a) * 180) / Math.PI);
};

/**
 * Every preset is an icon-only button by default, named by its translated label and a `controlSize` square at
 * every size (decision 12); `iconOnly={false}` shows the label instead, with no Tooltip, as tall as the icon-only form. Star and Bookmark are toggles that swap icon and label; Disclosure reports `aria-expanded` (not
 * `aria-pressed`) and turns its one caret a quarter while expanded; Save is primary and Cancel is not; Clipboard
 * writes its value and confirms with a check and a "Copied" label.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const row = sizeRow(canvasElement, size);
      const control = controlSize(size);
      for (const { id } of PRESETS) {
        const rect = byTestId(row, `${id}-${size}`).getBoundingClientRect();
        await expect(rect.width, `${id} ${size}`).toBeCloseTo(control, 0);
        await expect(rect.height, `${id} ${size}`).toBeCloseTo(control, 0);
        const text = byTestId(row, `${id}-labelled-${size}`).getBoundingClientRect();
        await expect(text.height, `${id} labelled ${size}`).toBeCloseTo(control, 0);
        await expect(text.width, `${id} labelled ${size}`).toBeGreaterThan(control);
      }
    }

    const md = sizeRow(canvasElement, 'md');
    for (const { id } of PRESETS) {
      const name = NAMES[id];
      const button = byTestId(md, `${id}-md`);
      await waitFor(() => expect(button, name).toHaveAccessibleName(name), { timeout: 10_000 });
      await expect(button, name).toHaveAttribute('data-square');
      await expect(button.querySelector('svg'), name).not.toBeNull();
      await expect(button.textContent, name).toBe('');
      // The labelled form shows its label as text beside the icon, named by that text rather than `aria-label`.
      const labelled = byTestId(md, `${id}-labelled-md`);
      await expect(labelled, name).not.toHaveAttribute('data-square');
      await expect(labelled, name).not.toHaveAttribute('aria-label');
      await expect(labelled, name).toHaveTextContent(name);
      await expect(labelled, name).toHaveAccessibleName(name);
      await expect(labelled.querySelector('svg'), name).not.toBeNull();
    }

    // A labelled preset has no Tooltip on hover, while the icon-only form still has one.
    const labelledAdd = byTestId(md, 'add-labelled-md');
    await realHover(labelledAdd);
    await expectNoTooltip(labelledAdd);
    const add = byTestId(md, 'add-md');
    await realHover(add);
    await expectTooltip(add, 'Add');
    await realUnhover(add);

    // Save is primary; Cancel keeps the default variant.
    await expect(byTestId(md, 'save-labelled-md')).toHaveAttribute('data-variant', 'primary');
    await expect(byTestId(md, 'save-md')).toHaveAttribute('data-variant', 'primary');
    await expect(byTestId(md, 'cancel-labelled-md')).toHaveAttribute('data-variant', 'default');
    await expect(getComputedStyle(byTestId(md, 'save-labelled-md')).backgroundColor).not.toBe(
      getComputedStyle(byTestId(md, 'cancel-labelled-md')).backgroundColor,
    );
    await waitFor(() => expect(iconHref(byTestId(md, 'save-md'))).toContain('ph--check--regular'));
    await waitFor(() => expect(iconHref(byTestId(md, 'cancel-md'))).toContain('ph--x--regular'));

    const star = byTestId(md, 'star-md');
    await expect(star).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(iconHref(star)).toContain('ph--star--regular'));
    await userEvent.click(star);
    await waitFor(() => expect(star).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() => expect(iconHref(star)).toContain('ph--star--fill'));
    await expect(star).toHaveAccessibleName('Unstar');
    await expect(star).toHaveAttribute('data-icon-valence', 'warning');
    await expect(star).not.toHaveAttribute('aria-expanded');
    // The labelled Star's text follows its pressed state too.
    const labelledStar = byTestId(md, 'star-labelled-md');
    await userEvent.click(labelledStar);
    await waitFor(() => expect(labelledStar).toHaveTextContent('Unstar'));

    const bookmark = byTestId(md, 'bookmark-md');
    await userEvent.click(bookmark);
    await waitFor(() => expect(bookmark).toHaveAttribute('aria-pressed', 'true'));
    await waitFor(() => expect(iconHref(bookmark)).toContain('ph--bookmark-simple--fill'));
    await expect(bookmark).toHaveAccessibleName('Remove bookmark');
    await userEvent.click(bookmark);
    await waitFor(() => expect(bookmark).toHaveAttribute('aria-pressed', 'false'));
    await expect(bookmark).toHaveAccessibleName('Bookmark');

    // One caret, turned a quarter while expanded and back when collapsed.
    const disclosure = byTestId(md, 'disclosure-md');
    const caret = disclosure.querySelector('svg');
    if (!caret) {
      throw new Error('missing caret');
    }
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(disclosure).not.toHaveAttribute('aria-pressed');
    await waitFor(() => expect(iconHref(disclosure)).toContain('ph--caret-right--regular'));
    await expect(getComputedStyle(caret).transform).toBe('none');
    await userEvent.click(disclosure);
    await waitFor(() => expect(disclosure).toHaveAttribute('aria-expanded', 'true'));
    await expect(disclosure).toHaveAccessibleName('Close');
    await expect(iconHref(disclosure)).toContain('ph--caret-right--regular');
    await expect(getComputedStyle(caret).transitionProperty).toContain('transform');
    await waitFor(() => expect(rotation(caret)).toBe(90));
    await userEvent.click(disclosure);
    await waitFor(() => expect(disclosure).toHaveAttribute('aria-expanded', 'false'));
    await expect(disclosure).toHaveAccessibleName('Open');
    await waitFor(() => expect(getComputedStyle(caret).transform).toBe('none'));

    const mic = byTestId(md, 'mic-md');
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
      const copy = byTestId(md, 'clipboard-md');
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
