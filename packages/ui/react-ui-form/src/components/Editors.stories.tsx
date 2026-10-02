//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Format, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Next } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';
import { FormField } from './FormField.tsx';
import { RefEditor } from './RefEditor.tsx';

const NoteSchema = Schema.Struct({
  title: Schema.optional(Schema.String.annotate({ title: 'Title' })),
  notes: Schema.optional(
    Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Markdown)).annotate({ title: 'Notes' }),
  ),
});

type NoteValues = Schema.Schema.Type<typeof NoteSchema>;

/** Editors framed by `Next.ControlFrame`: a markdown field (multi-line) and the reference editor (one line). */
const DefaultStory = (_: PaneArgs) => {
  const { space } = useClientStory();
  const people = useQuery(space?.db, Filter.type(Person.Person));
  const [values, setValues] = useState<NoteValues>({ title: 'Kickoff', notes: '# Agenda' });
  const [recipients, setRecipients] = useState('');
  return (
    <Next.Panel.Root>
      <Next.Panel.Body asChild>
        <Next.ScrollArea.Root>
          <Next.ScrollArea.Viewport asChild>
            <Next.Container>
              <Form.Root
                schema={NoteSchema}
                values={values}
                onValuesChanged={(next) => setValues((previous) => ({ ...previous, ...next }))}
              >
                <Form.Content>
                  <Form.Fields />
                  <FormField label='Attendees' standalone>
                    {people.length > 0 && (
                      <RefEditor
                        db={space?.db}
                        type={Person.Person}
                        value={recipients}
                        start={<Next.Icon icon='ph--users--regular' />}
                        onChange={setRecipients}
                        data-testid='attendees'
                      />
                    )}
                  </FormField>
                </Form.Content>
              </Form.Root>
            </Next.Container>
          </Next.ScrollArea.Viewport>
        </Next.ScrollArea.Root>
      </Next.Panel.Body>
      <Next.Panel.Footer>
        <Next.Typography truncate data-testid='values'>
          {JSON.stringify({ ...values, recipients })}
        </Next.Typography>
      </Next.Panel.Footer>
    </Next.Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/Editors',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withNextPane({ height: '36rem' }),
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Obj.make(Person.Person, { fullName: 'Alice Carroll' }));
        space.db.add(Obj.make(Person.Person, { fullName: 'Bob Dylan' }));
      },
    }),
  ],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const readValues = (canvasElement: HTMLElement) =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** The element matching `selector` under `root`, failing the test when there is none. */
const select = (root: Element, selector: string): HTMLElement => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}.`);
  }
  return element;
};

/** 1. Test: both editors sit in control frames on the form's control track and write their values. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The client creates its space asynchronously, which is slow under full-suite load.
    const attendees = await canvas.findByTestId('attendees', {}, { timeout: 15_000 });
    const title = canvas.getByRole('textbox', { name: 'Title' }).getBoundingClientRect();

    // 2. The markdown field is a multi-line frame on the control track, at least six lines tall, and edits the value.
    const notes = select(canvasElement, '[data-scope="control-frame"][data-rows]');
    const notesBox = notes.getBoundingClientRect();
    await expect(notesBox.left).toBeCloseTo(title.left, 0);
    await expect(notesBox.right).toBeCloseTo(title.right, 0);
    await expect(notesBox.height).toBeGreaterThan(title.height * 3);
    const content = select(notes, '.cm-content');
    await expect(content).toHaveTextContent('Agenda');
    await userEvent.click(content);
    await userEvent.keyboard(' Intro');
    await waitFor(() => expect(readValues(canvasElement).notes).toContain('Intro'));
    await expect(getComputedStyle(notes).outlineStyle).toBe('solid');

    // 3. The reference editor is a control-tall frame with its adornment, on the same track.
    const attendeesBox = attendees.getBoundingClientRect();
    await expect(attendeesBox.height).toBeCloseTo(title.height, 0);
    await expect(attendeesBox.left).toBeCloseTo(title.left, 0);
    await expect(attendeesBox.right).toBeCloseTo(title.right, 0);
    select(attendees, '[data-part="start"] svg');
    await userEvent.click(select(attendees, '.cm-content'));
    await userEvent.keyboard('hello');
    await waitFor(() => expect(readValues(canvasElement).recipients).toContain('hello'));
    await expect(getComputedStyle(attendees).outlineStyle).toBe('solid');
  },
};
