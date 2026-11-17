//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter, Obj, Tag } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Popover from '@dxos/react-ui/Popover';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import { Person } from '@dxos/types';

import { NextJsonLayout, type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { ObjectForm, ObjectProperties } from './ObjectForm.tsx';

type StoryArgs = PaneArgs & { component?: 'form' | 'properties' | 'transient' | 'popover' };

const DefaultStory = ({ component = 'form' }: StoryArgs) => {
  const { space } = useClientStory();
  const [person] = useQuery(space?.db, Filter.type(Person.Person));
  const [snapshot] = useObject(person);
  // Stands in for the popover's dismissal, so the test can assert that both buttons close their host.
  const [closed, setClosed] = useState(0);
  const handleClose = useCallback(() => setClosed((closed) => closed + 1), []);
  if (!person) {
    return <></>;
  }

  // `closed` rides along with the object so one JSON panel shows everything the story asserts.
  const data = {
    object: { ...snapshot, tags: Obj.getMeta(person).tags.map((tag) => tag.label) },
    closed,
  };

  return (
    <NextJsonLayout data={data}>
      {/* The play functions read this, not the JSON panel beside it: the panel's `textContent` is the tokenizer's
          span tree flattened, which drops spaces inside string values ("Alice Liddell" reads back as
          "AliceLiddell"). `hidden` rather than a class, since these files carry no class names. */}
      <span hidden data-testid='values-source'>
        {JSON.stringify(data)}
      </span>
      <Panel.Root>
        {component === 'form' ? (
          <Panel.Body asChild>
            <ScrollArea.Root>
              <ScrollArea.Viewport asChild>
                <Layout.Container>
                  <ObjectForm object={person} type={Person.Person} />
                </Layout.Container>
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Panel.Body>
        ) : component === 'popover' ? (
          // The rename popover's shape: the properties form in a popup, where its Save and Cancel sit in the
          // panel's footer. A footer is a bar, which lifts a step off a plank; there is no plank here, so the
          // footer takes the popup's own surface instead of reading as a strip across the bottom.
          <Popover.Root defaultOpen>
            <Popover.Trigger data-testid='popover-trigger'>Rename</Popover.Trigger>
            {/* The popover's own width and the form's own height: what the story shows is the surfaces, and
                `src/next` carries no class names of its own. */}
            <Popover.Content>
              <ObjectProperties object={person} showTags={false} onClose={handleClose} />
            </Popover.Content>
          </Popover.Root>
        ) : (
          <ObjectProperties object={person} onClose={component === 'transient' ? handleClose : undefined} />
        )}
      </Panel.Root>
    </NextJsonLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/ObjectForm',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withNextPane({ width: '100dvw', height: '100dvh' }),
    withClientProvider({
      types: [Person.Person, Tag.Tag],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(Tag.make({ label: 'Colleague', hue: 'sky' }));
        const tag = space.db.add(Tag.make({ label: 'Friend', hue: 'emerald' }));
        const person = space.db.add(
          Obj.make(Person.Person, {
            fullName: 'Alice Carroll',
            jobTitle: 'Engineer',
            emails: [{ value: 'alice@example.com' }],
          }),
        );
        Obj.update(person, (person) => {
          Obj.getMeta(person).tags = [tag];
        });
      },
    }),
  ],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Properties: Story = { args: { component: 'properties' } };

export const Transient: Story = { args: { component: 'transient' } };

export const InPopover: Story = { args: { component: 'popover' } };

const readValues = (canvasElement: HTMLElement) =>
  JSON.parse(within(canvasElement).getByTestId('values-source').textContent ?? '{}');

const readObject = (canvasElement: HTMLElement) => readValues(canvasElement).object;

/** 1. Test: the object's fields and meta tags edit the live object; a tag is picked and created inline. */
/** In a popup the panel and its footer are one surface, so the actions do not read as a strip of their own. */
export const TestInPopover: Story = {
  args: { component: 'popover' },
  // The popover mounts through a portal, so everything here is read from the popup rather than the story's canvas.
  play: async () => {
    // The same bound the neighbouring stories allow: nothing renders until the client has created the person.
    const popup = await waitFor(
      () => {
        const element = document.querySelector<HTMLElement>('.dx-popup');
        if (!element) {
          throw new Error('Missing popup');
        }
        return element;
      },
      { timeout: 15_000 },
    );
    const panel = popup.querySelector('.dx-panel');
    const footer = popup.querySelector('.dx-panel-footer');
    await expect(panel).not.toBeNull();
    await expect(footer).not.toBeNull();
    await expect(getComputedStyle(footer!).backgroundColor).toBe(getComputedStyle(panel!).backgroundColor);
    // The actions are there to be framed: without them the footer would not render at all.
    await expect(within(popup).getAllByTestId('save-button').length).toBeGreaterThan(0);
  },
};

export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. The form shows the live object (the client creates its space asynchronously).
    const name = await canvas.findByDisplayValue('Alice Carroll', {}, { timeout: 15_000 });

    // 3. An edit writes the property back to the object.
    await userEvent.clear(name);
    await userEvent.type(name, 'Alice Liddell');
    await waitFor(() => expect(readObject(canvasElement).fullName).toBe('Alice Liddell'));

    // 4. The meta tags are one multiple selection: a chip per tag in its hue, and a caret opening a search popup where
    // picking toggles a tag without closing.
    const tags = canvas.getByTestId('_tags');
    await expect(within(tags).getByText('Friend').closest('[data-hue]')).toHaveAttribute('data-hue', 'emerald');
    await userEvent.click(caretOf(tags));
    const popup = await body.findByRole('dialog');
    await userEvent.click(within(popup).getByRole('option', { name: 'Colleague' }));
    await waitFor(() => expect(readObject(canvasElement).tags).toEqual(['Friend', 'Colleague']));
    await expect(within(tags).getByText('Colleague')).toBeVisible();

    // 5. An unmatched query offers `Add tag “…”` with a tag icon; the create form is seeded with the query and has a hue
    // Select, and the new tag joins the selection.
    await userEvent.keyboard('Family');
    const create = await within(popup).findByRole('option', { name: 'Add tag “Family”' });
    await expect(create.querySelector('[data-scope="icon"]')?.getAttribute('data-icon')).toBe('ph--tag--regular');
    await userEvent.click(create);
    await expect(await within(popup).findByRole('textbox', { name: 'Label' })).toHaveValue('Family');
    await expect(within(popup).getByRole('combobox', { name: 'Hue' })).toBeInTheDocument();
    await userEvent.click(within(popup).getByTestId('save-button'));
    await waitFor(() => expect(readObject(canvasElement).tags).toEqual(['Friend', 'Colleague', 'Family']));
    await userEvent.keyboard('{Escape}');

    // 6. A chip's delete removes its tag.
    await userEvent.click(within(tags).getByRole('button', { name: /Colleague/ }));
    await waitFor(() => expect(readObject(canvasElement).tags).toEqual(['Friend', 'Family']));
  },
};

/** The tags row's caret trigger. */
const caretOf = (control: HTMLElement): HTMLElement => {
  const caret = control.querySelector<HTMLElement>('[data-scope="combobox"][data-part="trigger"]');
  if (!caret) {
    throw new Error('No caret trigger.');
  }
  return caret;
};

/** 1. TestProperties: the properties pane scrolls its own form and edits the object the same way. */
export const TestProperties: Story = {
  args: { component: 'properties' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const title = await canvas.findByDisplayValue('Engineer', {}, { timeout: 15_000 });
    await userEvent.type(title, ' II');
    await waitFor(() => expect(readObject(canvasElement).jobTitle).toBe('Engineer II'));
    await expect(within(canvas.getByTestId('_tags')).getByText('Friend')).toBeVisible();
  },
};

const readClosed = (canvasElement: HTMLElement) => readValues(canvasElement).closed;

/** 1. TestTransient: with `onClose`, the form holds its edits until Save; Cancel discards them. */
export const TestTransient: Story = {
  args: { component: 'transient' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. The pane shows the live object and, unlike the live variant, a Cancel and a Save.
    const title = await canvas.findByDisplayValue('Engineer', {}, { timeout: 15_000 });
    await expect(canvas.getByTestId('cancel-button')).toBeVisible();
    await expect(canvas.getByTestId('save-button')).toBeVisible();

    // 3. Typing writes nothing: the object still holds the value it opened with.
    await userEvent.clear(title);
    await userEvent.type(title, 'Architect');
    await expect(readObject(canvasElement).jobTitle).toBe('Engineer');

    // 4. Cancel leaves the object untouched and closes.
    await userEvent.click(canvas.getByTestId('cancel-button'));
    await waitFor(() => expect(readClosed(canvasElement)).toBe(1));
    await expect(readObject(canvasElement).jobTitle).toBe('Engineer');

    // 5. Save writes every edit at once and closes.
    const reopened = canvas.getByDisplayValue('Architect');
    await userEvent.clear(reopened);
    await userEvent.type(reopened, 'Architect II');
    await userEvent.click(canvas.getByTestId('save-button'));
    await waitFor(() => expect(readObject(canvasElement).jobTitle).toBe('Architect II'));
    await expect(readClosed(canvasElement)).toBe(2);
  },
};
