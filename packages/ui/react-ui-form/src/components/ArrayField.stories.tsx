//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Organization } from '../testing/schema.ts';
import { Form } from './Form.tsx';
import { ArraySchema, type ArrayValues } from './testing.ts';

const INITIAL: ArrayValues = {
  tags: ['red', 'green'],
  steps: ['Mix', 'Bake', 'Cool'],
  contacts: [{ kind: 'email', value: 'ada@example.com' }],
};

/** Arrays on `@dxos/react-ui-list` OrderedList: add, remove, and keyboard reorder for an ordered array. */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState<ArrayValues>(INITIAL);
  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              <Form.Root
                schema={ArraySchema}
                values={values}
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <Form.Content>
                  <Form.Fields />
                </Form.Content>
              </Form.Root>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer>
        <Typography.Text truncate data-testid='values'>
          {JSON.stringify(values)}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/ArrayField',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane()],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const readValues = (canvasElement: HTMLElement): ArrayValues =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** 1. Test: add, edit, remove, and reorder from the keyboard. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. Each array is a named listbox; only the ordered one has drag handles.
    const tags = canvas.getByRole('listbox', { name: 'Tags' });
    const steps = canvas.getByRole('listbox', { name: 'Steps' });
    await expect(within(tags).getAllByRole('option')).toHaveLength(2);
    await expect(within(tags).queryAllByRole('button', { name: 'Drag to rearrange' })).toHaveLength(0);
    await expect(within(steps).getAllByRole('button', { name: 'Drag to rearrange' })).toHaveLength(3);

    // 3. Add appends an empty item whose input takes the typed text.
    await userEvent.click(canvas.getByTestId('tags.add'));
    await waitFor(() => expect(within(tags).getAllByRole('option')).toHaveLength(3));
    const inputs = within(tags).getAllByRole('textbox');
    await userEvent.type(inputs[2], 'blue');
    await waitFor(() => expect(readValues(canvasElement).tags).toEqual(['red', 'green', 'blue']));

    // 4. Remove deletes that row's value.
    await userEvent.click(within(tags).getAllByRole('button', { name: 'Delete item' })[0]);
    await waitFor(() => expect(readValues(canvasElement).tags).toEqual(['green', 'blue']));

    // 5. Alt+ArrowDown on a drag handle moves the row down.
    within(steps).getAllByRole('button', { name: 'Drag to rearrange' })[0].focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(readValues(canvasElement).steps).toEqual(['Bake', 'Mix', 'Cool']));

    // 6. The header row: label at the start, the add Button's block cell ending the row, on the rows' remove column.
    const add = canvas.getByTestId('tags.add');
    invariant(add.parentElement);
    const header = add.parentElement.getBoundingClientRect();
    const label = canvas.getByText('Tags').getBoundingClientRect();
    await expect(label.left).toBeCloseTo(header.left, 0);
    await expect(add.getBoundingClientRect().right + parseFloat(getComputedStyle(add).marginRight)).toBeCloseTo(
      header.right,
      0,
    );
    const centre = (element: Element) => {
      const box = element.getBoundingClientRect();
      return box.left + box.width / 2;
    };
    for (const remove of within(tags).getAllByRole('button', { name: 'Delete item' })) {
      await expect(centre(remove)).toBeCloseTo(centre(add), 0);
    }

    // 7. An object item renders its fields as a nested, bordered set.
    const value = canvas.getByRole('textbox', { name: 'Value' });
    await expect(value).toHaveValue('ada@example.com');
    const group = value.closest('[role="group"][data-inset]');
    invariant(group);
    await expect(getComputedStyle(group).borderTopWidth).toBe('1px');
  },
};

// The form owns its organizations: add creates one, and each row is its fields inline.
const OwnedSchema = Schema.Struct({
  organizations: Schema.Array(Ref.Ref(Organization)).pipe(
    Annotation.FormCreateAnnotation.set(Type.getTypename(Organization)),
    Schema.annotate({ title: 'Organizations' }),
  ),
});

type OwnedValues = Schema.Schema.Type<typeof OwnedSchema>;

/** An owned-ref array: local objects, so the form creates and edits them without a database. */
const OwnedStory = (_: PaneArgs) => {
  const acme = useMemo(() => Obj.make(Organization, { name: 'Acme' }), []);
  const [acmeName] = useObject(acme, 'name');
  const [values, setValues] = useState<OwnedValues>(() => ({ organizations: [Ref.make(acme)] }));
  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              <Form.Root
                schema={OwnedSchema}
                values={values}
                useType={() => Organization}
                onCreate={(type, values) =>
                  Type.isObject(type) ? Obj.make(type, { name: 'Initech', ...values }) : undefined
                }
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <Form.Content>
                  <Form.Fields />
                </Form.Content>
              </Form.Root>
            </Layout.Container>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
      <Panel.Footer>
        <Typography.Text truncate data-testid='count'>
          {values.organizations.length}
        </Typography.Text>
        <Typography.Text truncate data-testid='acme'>
          {acmeName}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};

/** 1. Test: owned rows start folded under the target's name, add creates an open row, and edits reach the target. */
export const Owned: Story = {
  render: OwnedStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. The existing row is folded and named by its target.
    const acme = canvas.getByRole('group', { name: 'Acme' });
    await expect(within(acme).queryByRole('textbox', { name: 'Full name' })).toBeNull();

    // 3. Unfolded, its fields write back to the target.
    await userEvent.click(within(acme).getByRole('button', { name: 'Acme' }));
    const name = await within(acme).findByRole('textbox', { name: 'Full name' });
    await userEvent.type(name, ' Corp');
    await waitFor(() => expect(canvas.getByTestId('acme')).toHaveTextContent('Acme Corp'));

    // 4. Add creates a target whose row starts open, and naming it names the row.
    await userEvent.click(canvas.getByTestId('organizations.add'));
    await waitFor(() => expect(canvas.getByTestId('count')).toHaveTextContent('2'));
    const created = canvas.getByRole('group', { name: 'Initech' });
    await userEvent.type(within(created).getByRole('textbox', { name: 'Full name' }), ' Ltd');
    await expect(await canvas.findByRole('group', { name: 'Initech Ltd' })).toBeInTheDocument();
  },
};
