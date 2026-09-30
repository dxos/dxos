//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, within } from 'storybook/test';

import { Next } from '@dxos/react-ui/next';
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
    <Next.Panel.Root>
      <Next.Panel.Body>
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
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/next/Settings',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ width: '44rem', height: '44rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Narrow: Story = { args: { paneWidth: '20rem' } };

type RowGeometry = { label: DOMRect; description?: DOMRect; control: DOMRect };

/** The label, description and control boxes of every settings row; a control with no box of its own (a Select root) reports its first boxed child. */
const rows = (canvasElement: HTMLElement): RowGeometry[] =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-scope="field"][data-part="root"][data-layout="row"]')].map(
    (row) => {
      const header = row.querySelector<HTMLElement>(':scope > [data-part="header"]');
      const helper = row.querySelector<HTMLElement>(':scope > [data-part="helper-text"]');
      const control = [...row.children].find((child) => child !== header && child !== helper) as HTMLElement;
      const boxed = control.getBoundingClientRect().width > 0 ? control : (control.firstElementChild as HTMLElement);
      return {
        label: header!.getBoundingClientRect(),
        description: helper?.getBoundingClientRect(),
        control: boxed.getBoundingClientRect(),
      };
    },
  );

/** 1. Test: two tracks shared across rows and sections; labels and descriptions left of the controls; bordered rows. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const geometry = rows(canvasElement);
    // 2. Seven rows across the two sections.
    await expect(geometry).toHaveLength(7);

    // 3. Every control starts on the same line, in both sections; every label too.
    for (const row of geometry) {
      await expect(row.control.left).toBeCloseTo(geometry[0].control.left, 0);
      await expect(row.label.left).toBeCloseTo(geometry[0].label.left, 0);
      // 4. Label and description sit in the first track, left of the control.
      await expect(row.label.right).toBeLessThanOrEqual(row.control.left);
      await expect(row.description?.left).toBeCloseTo(row.label.left, 0);
      await expect(row.description!.top).toBeGreaterThanOrEqual(row.label.bottom - 0.5);
    }
    await expect(geometry[0].control.left - geometry[0].label.left).toBeGreaterThan(100);

    // 5. Rows are bordered cards one level above the pane; the switch is labelled by its row.
    const row = canvasElement.querySelector<HTMLElement>('[data-layout="row"]')!;
    await expect(row).toHaveAttribute('data-surface', '+1');
    await expect(getComputedStyle(row).borderTopWidth).toBe('1px');
    await expect(canvas.getByRole('switch', { name: 'Show toolbar' })).toBeChecked();
    await expect(canvas.getByRole('combobox', { name: 'Default view mode' })).toBeInTheDocument();
  },
};

/** 1. TestNarrow: below the collapse width each row stacks: label, description, then the control under them. */
export const TestNarrow: Story = {
  args: { paneWidth: '20rem' },
  play: async ({ canvasElement }) => {
    for (const row of rows(canvasElement)) {
      await expect(row.control.top).toBeGreaterThanOrEqual(row.description!.bottom - 0.5);
      await expect(row.control.left).toBeCloseTo(row.label.left, 0);
    }
  },
};
