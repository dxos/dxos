//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { ErrorFallback, type ErrorFallbackProps, ErrorStack, type ErrorStackFrame } from '../index.ts';

type StoryArgs = SizeArgs & Pick<ErrorFallbackProps, 'title'> & { message: string };

/** Frames as `error-stack-parser` yields them: one served from the workspace, one from a dependency. */
const FRAMES: ErrorStackFrame[] = [
  {
    functionName: 'renderPlank',
    fileName: 'http://localhost:5173/@fs/Users/dev/dxos/packages/plugins/plugin-deck/src/Plank.tsx',
    lineNumber: 42,
    columnNumber: 7,
  },
  {
    functionName: 'renderWithHooks',
    fileName: 'http://localhost:5173/node_modules/.vite/deps/react-dom.js',
    lineNumber: 1024,
    columnNumber: 18,
  },
];

const DefaultStory = ({ title, message }: StoryArgs) => (
  <div className='flex flex-col'>
    <ErrorFallback title={title} error={new Error(message)} data={{ plank: 'deck', attempt: 2 }} />
    <ErrorStack frames={FRAMES} />
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/ErrorFallback',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[40rem]' }), withTheme()],
  args: { size: 'md', title: 'Plank Error', message: 'Cannot read properties of undefined' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The fallback is an alert naming the error, with copyable data; local stack frames link to their source. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));

    const alert = canvas.getByRole('alert');
    await expect(alert).toHaveAttribute('data-testid', 'error-boundary-fallback');
    await expect(within(alert).getByRole('heading', { level: 1, name: 'Plank Error' })).toBeVisible();
    await expect(within(alert).getByText('Cannot read properties of undefined')).toBeVisible();

    // Data is shown as JSON under a labelled copy button.
    await expect(within(alert).getByRole('button', { name: 'Data' })).toBeVisible();
    await expect(alert.querySelector('[data-part="data"]')?.textContent).toContain('"attempt": 2');

    // Stack: one row per frame; only the workspace frame links to VS Code.
    const stack = canvasElement.querySelector<HTMLElement>('[data-scope="error-stack"][data-part="root"]');
    const frames = stack?.querySelectorAll<HTMLElement>('[data-part="frame"]') ?? [];
    await expect(frames).toHaveLength(2);
    const link = within(frames[0]).getByRole('link', { name: 'renderPlank' });
    await expect(link).toHaveAttribute(
      'href',
      'vscode://file//Users/dev/dxos/packages/plugins/plugin-deck/src/Plank.tsx:42:7',
    );
    await expect(within(frames[0]).getByText('plugins/plugin-deck/src/Plank.tsx')).toBeVisible();
    await expect(within(frames[1]).queryByRole('link')).toBeNull();

    // The last frame's connector stops at its branch, so the tree ends there.
    const [first, last] = [getComputedStyle(frames[0], '::before'), getComputedStyle(frames[1], '::before')];
    await expect(parseFloat(last.height)).toBeLessThan(parseFloat(first.height));
  },
};
