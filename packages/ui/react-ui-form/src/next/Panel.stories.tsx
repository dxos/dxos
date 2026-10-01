//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Next } from '@dxos/react-ui/next';
import { withTheme } from '@dxos/react-ui/testing';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';
import { SCALAR_VALUES, ScalarSchema, type ScalarValues } from './testing.ts';

/** A form hosted in a `Next.Panel` plank at `sm`: toolbar header, scrolling body, actions in the footer. */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState<ScalarValues>(SCALAR_VALUES);
  return (
    <Form.Root
      schema={ScalarSchema}
      values={values}
      onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
      onSave={() => {}}
      onCancel={() => setValues(SCALAR_VALUES)}
    >
      <Next.Panel.Root size='sm' data-testid='panel'>
        <Next.Panel.Header>
          <Next.Toolbar.Root>
            <Next.Toolbar.Text>Profile</Next.Toolbar.Text>
          </Next.Toolbar.Root>
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Next.ScrollArea.Root>
            <Next.ScrollArea.Viewport asChild>
              <Next.Container gutter='rail'>
                <Form.Content>
                  <Form.Fields />
                </Form.Content>
              </Next.Container>
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Next.Panel.Body>
        <Next.Panel.Footer>
          <Form.Actions />
        </Next.Panel.Footer>
      </Next.Panel.Root>
    </Form.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/Panel',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '24rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = { args: { paneWidth: '20rem' } };

/** Distance from the panel's inline start to the first input: the start rail (or the inset when collapsed). */
const startGutter = (canvasElement: HTMLElement) => {
  const panel = within(canvasElement).getByTestId('panel').getBoundingClientRect();
  return within(canvasElement).getByRole('textbox', { name: 'Name' }).getBoundingClientRect().left - panel.left;
};

/** 1. Test: `sm` reaches controls and popups, the body scrolls between header and footer, the rails are a block wide. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const panel = canvas.getByTestId('panel');

    // 2. Controls read the panel's size: an sm block is 1.5rem, so the rail (a block) is 24px.
    await expect(startGutter(canvasElement)).toBeCloseTo(24, 0);

    // 3. The body scrolls; the header and the footer's actions stay in the pane.
    // The toolbar is a scroll viewport too; the body's is the one that is a Container.
    const viewport = panel.querySelector<HTMLElement>('.nx-scroll-viewport[data-scope="container"]');
    await expect(viewport && viewport.scrollHeight > viewport.clientHeight).toBe(true);
    const bodyBox = viewport!.getBoundingClientRect();
    await expect(
      canvasElement.querySelector('[role="form"] label')!.getBoundingClientRect().top,
    ).toBeGreaterThanOrEqual(bodyBox.top - 0.5);
    viewport!.scrollTop = viewport!.scrollHeight;
    await waitFor(async () => {
      const inputs = within(viewport!).getAllByRole('textbox');
      await expect(inputs[inputs.length - 1].getBoundingClientRect().bottom).toBeLessThanOrEqual(bodyBox.bottom + 0.5);
    });
    viewport!.scrollTop = 0;
    const footer = canvas.getByTestId('save-button').getBoundingClientRect();
    await expect(footer.bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom + 0.5);

    // 4. A popup opened from the form takes the panel's size, not the md default.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }));
    // The form's arrays are listboxes too, so the popup is the one portalled outside the canvas.
    const listbox = await waitFor(() => {
      const popup = body.getAllByRole('listbox').find((element) => !canvasElement.contains(element));
      if (!popup) {
        throw new Error('Select popup not open.');
      }
      return popup;
    });
    await expect(listbox.closest('[data-size]')).toHaveAttribute('data-size', 'sm');
    await userEvent.keyboard('{Escape}');
  },
};

/** 1. TestNarrow: below the collapse width the rails give way to the inset gutter. */
export const TestNarrow: Story = {
  args: { paneWidth: '20rem' },
  play: async ({ canvasElement }) => {
    const gutter = startGutter(canvasElement);
    await expect(gutter).toBeGreaterThan(0);
    await expect(gutter).toBeLessThan(24);
  },
};
