//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, within } from 'storybook/test';

import { invariant } from '@dxos/invariant';
import { Container, Panel, ScrollArea } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';
import { SettingsSchema, type SettingsValues } from './testing.ts';

const INITIAL: SettingsValues = { viewMode: 'preview', toolbar: true, fontSize: 14, interval: 60 };

/**
 * The settings variant as AUDIT §3.2 option 1: `Form.Content` sets two tracks, every row is a bordered `Field.Root
 * layout='row'` subgrid (label and description, then the control), and each section is a Fieldset subgrid, so the
 * control column is shared by every row of every section and stacks below the pane's collapse width.
 */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState<SettingsValues>(INITIAL);
  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Container>
              <Form.Root
                variant='settings'
                schema={SettingsSchema}
                values={values}
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <Form.Content>
                  <Form.FieldSet label='Editor' description='How documents open and look.' data-testid='editor'>
                    <Form.Fields include={['viewMode', 'toolbar', 'fontSize', 'numberedHeadings']} />
                  </Form.FieldSet>
                  <Form.FieldSet label='Sync' description='Replication with the sync server.' data-testid='sync'>
                    <Form.Fields include={['endpoint', 'interval', 'wifiOnly']} />
                  </Form.FieldSet>
                </Form.Content>
              </Form.Root>
            </Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/Settings',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ width: '44rem', height: '44rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = { args: { paneWidth: '20rem' } };

type RowGeometry = {
  label: DOMRect;
  description: DOMRect;
  control: DOMRect;
  /** The control's cell top: its box less the block inset a field gives a control. */
  controlTop: number;
};

/** The label, description and control boxes of every settings row; a control with no box of its own (a Select root) reports its first boxed child. */
const rows = (canvasElement: HTMLElement): RowGeometry[] =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-scope="field"][data-part="root"][data-layout="row"]')].map(
    (row) => {
      const header = row.querySelector<HTMLElement>(':scope > [data-part="header"]');
      const helper = row.querySelector<HTMLElement>(':scope > [data-part="helper-text"]');
      const control = [...row.children].find((child) => child !== header && child !== helper);
      invariant(header && helper && control);
      const boxed = control.getBoundingClientRect().width > 0 ? control : control.firstElementChild;
      invariant(boxed);
      const controlBox = boxed.getBoundingClientRect();
      return {
        label: header.getBoundingClientRect(),
        description: helper.getBoundingClientRect(),
        control: controlBox,
        controlTop: controlBox.top - parseFloat(getComputedStyle(boxed).marginTop),
      };
    },
  );

/**
 * 1. Test: two tracks shared across rows and sections; the title spans the row; description (left) and control (right)
 * share the next line, top-aligned; bordered rows.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const geometry = rows(canvasElement);
    // 2. Seven rows across the two sections.
    await expect(geometry).toHaveLength(7);

    // 3. Every control ends on the same line (right-aligned in the control track), in both sections; every title starts on one.
    for (const row of geometry) {
      await expect(row.control.right).toBeCloseTo(geometry[0].control.right, 0);
      await expect(row.label.left).toBeCloseTo(geometry[0].label.left, 0);
      // 4. The title spans both tracks on the first line.
      await expect(row.label.right).toBeGreaterThanOrEqual(row.control.right - 0.5);
      // A trim-sized space (0.5rem) separates the title from the line below it.
      await expect(row.description.top - row.label.bottom).toBeGreaterThanOrEqual(7.5);
      // 5. The description is left of the control, both starting on the next line.
      await expect(row.description.left).toBeCloseTo(row.label.left, 0);
      await expect(row.description.right).toBeLessThanOrEqual(row.control.right);
      await expect(row.description.top).toBeCloseTo(row.controlTop, 0);
    }
    await expect(geometry[0].control.right - geometry[0].label.left).toBeGreaterThan(100);

    // 6. Rows are bordered cards one level above the pane; the switch is labelled by its row.
    const row = canvasElement.querySelector<HTMLElement>('[data-layout="row"]');
    invariant(row);
    await expect(row).toHaveAttribute('data-surface', '+1');
    await expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    await expect(canvas.getByRole('switch', { name: 'Show toolbar' })).toBeChecked();
    await expect(canvas.getByRole('combobox', { name: 'Default view mode' })).toBeInTheDocument();

    // 7. A row's title reads as content and its description as secondary content.
    const titleElement = row.querySelector('label');
    const descriptionElement = row.querySelector('[data-part="helper-text"]');
    invariant(titleElement && descriptionElement);
    const title = getComputedStyle(titleElement);
    const description = getComputedStyle(descriptionElement);
    await expect(title.color).not.toBe(description.color);
    await expect(parseFloat(title.fontSize)).toBeGreaterThan(parseFloat(description.fontSize));
    // A row's description is text-base (16px), as the current settings rows.
    await expect(description.fontSize).toBe('16px');
  },
};

/** 1. TestNarrow: below the collapse width each row stacks: title, description, a gap, then the control. */
export const TestNarrow: Story = {
  args: { paneWidth: '20rem' },
  play: async ({ canvasElement }) => {
    for (const row of rows(canvasElement)) {
      await expect(row.description.top - row.label.bottom).toBeGreaterThanOrEqual(7.5);
      await expect(row.controlTop).toBeGreaterThan(row.description.bottom + 0.5);
      // The control stays at the end of the row when stacked.
      await expect(row.control.right).toBeCloseTo(row.label.right, 0);
    }
  },
};
