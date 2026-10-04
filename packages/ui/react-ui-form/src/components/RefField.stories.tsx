//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Entity, Obj } from '@dxos/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Container from '@dxos/react-ui/Container';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { type RefFieldDataProps, type RefOption } from '#types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Organization } from '../testing/schema.ts';
import { Form } from './Form.tsx';
import { ObjectPicker } from './ObjectPicker.tsx';
import { RefSchema } from './testing.ts';

const SPACE_ID = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';

/** Candidate objects as `getOptions` would map them; no database is needed to exercise the picker. */
const OPTIONS: RefOption[] = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli'].map((label, index) => ({
  id: `echo://${SPACE_ID}/01J00J9B45YHYSGZQTQMSKMGJ${index}`,
  label,
  description: index === 2 ? 'Software, Austin' : undefined,
}));

/** The story's own translations: the create row's `createOptionLabel`. */
const STORY_NS = 'react-ui-form.next.ref-field.story';

const useType: NonNullable<RefFieldDataProps['useType']> = () => Organization;

/** A single reference on the next `ObjectPicker`: a trigger button, a searchable popup and an inline create form. */
const DefaultStory = (_: PaneArgs) => {
  const [values, setValues] = useState({});
  const [options, setOptions] = useState(OPTIONS);
  const getOptions = useCallback(() => options, [options]);
  const handleCreate = useCallback<NonNullable<RefFieldDataProps['onCreate']>>((_schema, values) => {
    const organization = Obj.make(Organization, values);
    setOptions((options) => [
      ...options,
      { id: Entity.getURI(organization, { prefer: 'named' }), label: organization.name },
    ]);
    return organization;
  }, []);
  return (
    <Panel.Root size='sm'>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Container.Container>
              <Form.Root
                schema={RefSchema}
                values={values}
                getOptions={getOptions}
                useType={useType}
                createOptionLabel={['create-organization.label', { ns: STORY_NS }]}
                createOptionIcon='ph--buildings--regular'
                onCreate={handleCreate}
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <Form.Content>
                  <Form.Fields />
                </Form.Content>
              </Form.Root>
            </Container.Container>
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
  title: 'ui/react-ui-form/RefField',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '32rem' })],
  parameters: {
    layout: 'fullscreen',
    translations: [
      ...nextTranslations,
      { 'en-US': { [STORY_NS]: { 'create-organization.label': 'New organization “{{text}}”' } } },
    ],
  },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 1. Test: the trigger opens a search popup; picking writes a Ref, re-picking clears it, and create adds a target. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const values = canvas.getByTestId('values');

    // 2. The trigger is a button showing the placeholder; it opens a dialog whose search field takes focus.
    const trigger = canvasElement.querySelector<HTMLElement>('[data-scope="combobox"][data-part="trigger"]')!;
    await expect(trigger).toHaveTextContent('Employer');
    await userEvent.click(trigger);
    const popup = await body.findByRole('dialog');
    await waitFor(() => expect(within(popup).getByRole('combobox')).toHaveFocus());
    await expect(within(popup).getAllByRole('option')).toHaveLength(OPTIONS.length);
    // The popup took the row's size from the panel (Phase 4 decision 2).
    await expect(popup.closest('[data-size]')).toHaveAttribute('data-size', 'sm');

    // 3. An option's description renders under its label.
    const initech = within(popup).getByRole('option', { name: /Initech/ });
    await expect(initech.querySelector('[data-part="item-description"]')).toHaveTextContent('Software, Austin');

    // 4. Typing narrows the list; Enter picks, writes a reference and shows the label on the trigger.
    await userEvent.keyboard('ini');
    await waitFor(() => expect(within(popup).getAllByRole('option')).toHaveLength(2));
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(values).toHaveTextContent(OPTIONS[2].id));
    await waitFor(() => expect(trigger).toHaveTextContent('Initech'));

    // 5. Picking the selected option again clears the reference.
    await userEvent.click(trigger);
    await userEvent.click(within(await body.findByRole('dialog')).getByRole('option', { name: /Initech/ }));
    await waitFor(() => expect(values).not.toHaveTextContent('echo://'));

    // 6. An unmatched query offers a create row, which swaps the list for a create form; saving selects the new object.
    await userEvent.click(trigger);
    const createPopup = await body.findByRole('dialog');
    await userEvent.keyboard('Wayne');
    // The row takes the form's `createOptionLabel` (translated with the query) and `createOptionIcon`.
    const create = within(createPopup).getByRole('option', { name: 'New organization “Wayne”' });
    await expect(create.querySelector('[data-scope="icon"]')?.getAttribute('data-icon')).toBe('ph--buildings--regular');
    await userEvent.click(create);
    const name = await within(createPopup).findByRole('textbox', { name: 'Full name' });
    await userEvent.type(name, 'Wayne Enterprises');
    const save = within(createPopup).getByTestId('save-button');
    await userEvent.click(save);
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(trigger).toHaveTextContent('Wayne Enterprises'));
  },
};

/** `ObjectPicker trigger`: a toolbar's icon button opens the picker in place of the selection button. */
const CustomTriggerStory = () => {
  const [picked, setPicked] = useState<string>();
  return (
    <Toolbar.Root>
      <ObjectPicker
        options={OPTIONS}
        onSelect={setPicked}
        trigger={<Button.Button icon='ph--plus--regular' iconOnly label='Add object' />}
      />
      <span data-testid='picked'>{picked}</span>
    </Toolbar.Root>
  );
};

export const CustomTrigger: Story = {
  render: () => <CustomTriggerStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole('button', { name: 'Add object' }));
    const popup = await body.findByRole('dialog');
    await userEvent.click(within(popup).getByRole('option', { name: /Globex/ }));
    await waitFor(() => expect(canvas.getByTestId('picked')).toHaveTextContent(OPTIONS[1].id));
  },
};
