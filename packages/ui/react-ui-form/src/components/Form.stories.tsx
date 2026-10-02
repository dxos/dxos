//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Next } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/react-ui/testing';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { createSelectField } from './fields/index.ts';
import { Form } from './Form.tsx';
import { SCALAR_VALUES, ScalarSchema, type ScalarValues } from './testing.ts';

const fieldMap = { model: createSelectField({ options: ['opus', 'sonnet', 'haiku'] }) };

type StoryArgs = PaneArgs & { size?: Next.PanelRootProps['size'] };

/**
 * Same contract as the current Form: schema, values, onValuesChanged, onSave/onCancel, fieldMap, test ids. The values
 * show beside the form, as the current Form stories' `TestLayout` does.
 */
const DefaultStory = ({ size = 'md' }: StoryArgs) => {
  const [values, setValues] = useState<ScalarValues>(SCALAR_VALUES);
  const [saved, setSaved] = useState(false);
  return (
    <div className='grid grid-cols-2 gap-4 h-full min-h-0'>
      <Next.Panel.Root size={size} classNames='dx-card-surface rounded-sm overflow-hidden'>
        <Next.Panel.Body asChild>
          <Next.ScrollArea.Root>
            <Next.ScrollArea.Viewport asChild>
              <Next.Container>
                <Form.Root
                  schema={ScalarSchema}
                  values={values}
                  fieldMap={fieldMap}
                  testId='scalars'
                  onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
                  onSave={() => setSaved(true)}
                  onCancel={() => setValues(SCALAR_VALUES)}
                >
                  <Form.Content>
                    <Form.Fields />
                    <Form.ErrorText>{saved ? undefined : 'Not saved yet.'}</Form.ErrorText>
                    <Form.Actions />
                  </Form.Content>
                </Form.Root>
              </Next.Container>
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
        </Next.Panel.Body>
      </Next.Panel.Root>
      <JsonHighlighter data={values} testId='values' classNames='dx-card-surface rounded-sm text-sm min-h-0' />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-form/Form',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ width: '64rem', height: '48rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `Form.Viewport scroll width='document'`: the form scrolls at the pane's edge but keeps the reading width. */
export const DocumentWidth: Story = {
  render: () => (
    <Form.Root schema={ScalarSchema} values={SCALAR_VALUES}>
      <Form.Viewport scroll width='document'>
        <Form.Content>
          <Form.Fields />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-scope="panel"][data-width="document"]')).not.toBeNull();
  },
};

/** `Form.Submit` with its own icon, spinning while busy (a send rather than a save). */
export const Submit: Story = {
  render: () => (
    <Form.Root schema={ScalarSchema} values={SCALAR_VALUES} onSave={() => {}}>
      <Form.Content>
        <Form.Submit label='Send' icon='ph--paper-plane-tilt--regular' busy />
      </Form.Content>
    </Form.Root>
  ),
  play: async ({ canvasElement }) => {
    const button = await within(canvasElement).findByRole('button', { name: 'Send' });
    await expect(button.querySelector('svg[data-spin]')).not.toBeNull();
  },
};

const readValues = (canvasElement: HTMLElement): Record<string, unknown> =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** 1. Test: every scalar renderer is a named control that writes the form values, and the contract's test ids work. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. Text: typing writes through onValuesChanged.
    const name = canvas.getByRole('textbox', { name: 'Name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Grace');
    await waitFor(() => expect(readValues(canvasElement).name).toBe('Grace'));

    // 3. A cleared required field is invalid once touched; the header carries the error mark.
    await userEvent.clear(name);
    await userEvent.tab();
    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    await userEvent.type(name, 'Grace');
    await waitFor(() => expect(name).not.toHaveAttribute('aria-invalid', 'true'));

    // 4. Number: Ark's spinbutton; ArrowUp steps the integer.
    const age = canvas.getByRole('spinbutton', { name: 'Age' });
    await userEvent.click(age);
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(readValues(canvasElement).age).toBe(37));

    // 5. Boolean: a Switch labelled by the field (beside placement).
    await userEvent.click(canvas.getByRole('switch', { name: 'Active' }));
    await waitFor(() => expect(readValues(canvasElement).active).toBe(true));

    // 6. Select over literals, labelled through the Field; the value maps back to the literal.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await body.findByRole('option', { name: 'archived' }));
    await waitFor(() => expect(readValues(canvasElement).status).toBe('archived'));

    // 7. createSelectField from a fieldMap: the renderer owns its row, on Next.Select.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Model' }));
    await userEvent.click(await body.findByRole('option', { name: 'sonnet' }));
    await waitFor(() => expect(readValues(canvasElement).model).toBe('sonnet'));

    // 8. Textarea and password.
    await userEvent.type(canvas.getByRole('textbox', { name: 'Notes' }), 'Hello');
    await userEvent.type(canvas.getByLabelText('Secret'), 'pw');
    await waitFor(() => expect(readValues(canvasElement)).toMatchObject({ notes: 'Hello', secret: 'pw' }));

    // 9. Dates: segmented DateInputs named by their field labels.
    await expect(canvas.getByRole('group', { name: 'Birthday' })).toBeInTheDocument();
    await expect(canvas.getByRole('group', { name: 'Next meeting' })).toBeInTheDocument();
    await expect(canvas.getByRole('group', { name: 'Reminder' })).toBeInTheDocument();

    // 10. Geo point: two labelled coordinates in one standalone row.
    const latitude = canvas.getByRole('spinbutton', { name: 'Latitude' });
    await expect(latitude).toHaveValue(51.5072);
    await expect(canvas.getByRole('spinbutton', { name: 'Longitude' })).toHaveValue(-0.1276);

    // 11. Test ids: form.error until saved; save and cancel buttons; the form's testId on Content.
    await expect(canvas.getByTestId('scalars')).toHaveAttribute('role', 'form');
    await expect(canvas.getByTestId('form.error')).toHaveTextContent('Not saved yet.');
    await expect(canvas.getByTestId('cancel-button')).toBeInTheDocument();
    await userEvent.click(canvas.getByTestId('save-button'));
    await waitFor(() => expect(canvas.queryByTestId('form.error')).toBeNull());

    // 12. Every trailing icon shares one column and one size.
    await expectTrailingColumn(canvasElement);
  },
};

/** Selectors for every trailing icon of a form column, control adornments and row actions alike. */
const TRAILING_ICONS = [
  '.nx-select-trigger [data-part="indicator"] svg',
  '.nx-input-adornment > .nx-button:last-child svg',
  '.nx-field-header > .nx-button svg',
  '[role="option"] > .nx-button:last-child svg',
  '[data-part="legend"] > .nx-button svg',
].join(', ');

/**
 * The trailing icons (select carets, the stepper's last button, the password and calendar toggles, the array header's
 * add, its rows' remove and a nested group's disclosure) are all the size's control icon size and centre on their
 * level's end cell: one column for the form's own rows, and one indent step in for a nested group's legend, whose
 * enclosure indents its end as well as its start (DESIGN follow-up 60).
 */
const expectTrailingColumn = async (canvasElement: HTMLElement) => {
  const form = canvasElement.querySelector<HTMLElement>('[role="form"]')!;
  const icons = [...form.querySelectorAll<SVGElement>(TRAILING_ICONS)];
  // Status and Model carets, Age stepper, Secret toggle, Birthday and Next meeting calendars, Tags add and remove,
  // and the Address disclosure.
  await expect(icons).toHaveLength(9);
  const probe = canvasElement.ownerDocument.createElement('span');
  probe.style.display = 'block';
  probe.style.width = 'var(--nx-control-icon)';
  form.appendChild(probe);
  const iconSize = probe.getBoundingClientRect().width;
  probe.remove();
  const centre = (icon: SVGElement) => {
    const box = icon.getBoundingClientRect();
    return box.left + box.width / 2;
  };
  // A nested group's end column is the form's, less the group's end border and padding.
  const inset = (icon: SVGElement) => {
    const group = icon.closest<HTMLElement>('[data-inset]');
    const style = group && getComputedStyle(group);
    return style ? parseFloat(style.borderRightWidth) + parseFloat(style.paddingRight) : 0;
  };
  const column = centre(icons[0]);
  for (const icon of icons) {
    await expect(centre(icon) + inset(icon)).toBeCloseTo(column, 0);
    await expect(icon.getBoundingClientRect().width).toBeCloseTo(iconSize, 0);
  }
};

/** 1. The trailing column at the other sizes. */
const trailingColumnAt = (size: NonNullable<StoryArgs['size']>): Story => ({
  args: { size },
  play: async ({ canvasElement }) => {
    await expectTrailingColumn(canvasElement);
  },
});

export const TestXs = trailingColumnAt('xs');
export const TestSm = trailingColumnAt('sm');
export const TestLg = trailingColumnAt('lg');
export const TestXl = trailingColumnAt('xl');
