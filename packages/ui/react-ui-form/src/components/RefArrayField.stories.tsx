//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Annotation, DXN, Entity, Obj, Ref, Tag, Type } from '@dxos/echo';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';
import { DX_ANCHOR_ACTIVATE, type DxAnchorActivate, hues } from '@dxos/ui-types';

import { type RefFieldDataProps } from '#types';

import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';

class Project extends Type.makeObject<Project>(DXN.make('com.example.type.project', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.annotate({ title: 'Name' }),
    status: Schema.optional(Schema.String.annotate({ title: 'Status' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--building-office--regular', hue: 'amber' }),
  ),
) {}

type StoryArgs = PaneArgs & { display: 'tag' | 'title'; ordered: boolean };

/** The objects a database would hold: projects with a status, and tags with a hue. */
const makeObjects = (): Obj.Unknown[] => [
  Obj.make(Project, { name: 'Apollo', status: 'Active' }),
  Obj.make(Project, { name: 'Gemini', status: 'Done' }),
  Obj.make(Project, { name: 'Mercury' }),
  Tag.make({ label: 'Urgent', hue: 'rose' }),
  Tag.make({ label: 'Later', hue: 'sky' }),
  Tag.make({ label: 'Idea', hue: 'emerald' }),
];

const uriOf = (object: Obj.Unknown) => Entity.getURI(object, { prefer: 'named' });

/** An array of refs (projects for `title`, tags for `tag`) under `ArrayPresentationAnnotation`, on in-memory objects. */
const DefaultStory = ({ display, ordered }: StoryArgs) => {
  const [objects, setObjects] = useState(makeObjects);
  const target = display === 'tag' ? Tag.Tag : Project;
  // A codec over either target, so one story state holds both kinds of refs.
  const schema = useMemo<Schema.Codec<any, any>>(
    () =>
      Schema.Struct({
        items: Schema.Array(Ref.Ref(target)).pipe(
          Annotation.ArrayPresentationAnnotation.set({ display, ordered, description: 'status' }),
          Schema.annotate({ title: display === 'tag' ? 'Tags' : 'Projects' }),
          Schema.optional,
        ),
      }),
    [target, display, ordered],
  );
  // A plain predicate (not a type guard), so the candidates stay `Obj.Unknown`.
  const isTarget = useCallback((object: Obj.Unknown): boolean => Obj.instanceOf(target, object), [target]);
  const [values, setValues] = useState<{ items?: readonly Ref.Ref<Obj.Unknown>[] }>(() => ({
    items: objects
      .filter(isTarget)
      .slice(0, 2)
      .map((object) => Ref.make(object)),
  }));

  const [activated, setActivated] = useState<string>();
  useEffect(() => {
    const handleActivate = (event: Event) => setActivated((event as DxAnchorActivate).label);
    window.addEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true);
    return () => window.removeEventListener(DX_ANCHOR_ACTIVATE, handleActivate, true);
  }, []);

  // No database: the candidates are the in-memory objects of the target type, as options with a tag's hue.
  const getOptions = useCallback<NonNullable<RefFieldDataProps['getOptions']>>(
    () =>
      objects.filter(isTarget).map((object) => {
        const hue = Obj.instanceOf(Tag.Tag, object) ? hues.find((hue) => hue === object.hue) : undefined;
        return { id: uriOf(object), label: Obj.getLabel(object) ?? object.id, ...(hue && { hue }) };
      }),
    [objects, isTarget],
  );
  const useType = useCallback<NonNullable<RefFieldDataProps['useType']>>(() => target, [target]);
  const handleCreate = useCallback<NonNullable<RefFieldDataProps['onCreate']>>(
    (_type, values) => {
      const created = display === 'tag' ? Tag.make({ label: values.label }) : Obj.make(Project, values);
      setObjects((objects) => [...objects, created]);
      return created;
    },
    [display],
  );

  const labels = (values.items ?? []).map((ref) => {
    const object = objects.find((object) => uriOf(object) === ref.uri.toString());
    return object ? (Obj.instanceOf(Project, object) ? object.name : Obj.getLabel(object)) : ref.uri.toString();
  });
  return (
    <Panel.Root size='sm'>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              <Form.Root
                schema={schema}
                values={values}
                getOptions={getOptions}
                useType={useType}
                onCreate={handleCreate}
                createInitialValuePath={display === 'tag' ? 'label' : 'name'}
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
          {JSON.stringify(labels)}
        </Typography.Text>
        <Typography.Text truncate data-testid='activated'>
          {activated ?? ''}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/RefArrayField',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '36rem' })],
  args: { display: 'title', ordered: false },
  argTypes: {
    display: { control: 'inline-radio', options: ['title', 'tag'] },
    ordered: { control: 'boolean' },
  },
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tags: Story = { args: { display: 'tag' } };

const readValues = (canvasElement: HTMLElement): string[] =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent || '[]');

/** The element matching `selector` under `root`, failing the test when there is none. */
const select = (root: Element, selector: string): HTMLElement => {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) {
    throw new Error(`No element matches ${selector}.`);
  }
  return element;
};

/**
 * 1. TestTitle: unordered title rows show the type's icon in its hue, the label and the configured description; a row
 * opens its object, Remove deletes it, and the picker below adds one or creates one inline.
 */
export const TestTitle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const list = canvas.getByRole('listbox', { name: 'Projects' });
    const rows = within(list).getAllByRole('option');
    await expect(rows).toHaveLength(2);

    // 2. A row: the type's icon in its hue, the label, the `status` description; no drag handle while unordered.
    await expect(select(rows[0], '[data-part="item-icon"] [data-scope="icon"]').getAttribute('data-icon')).toBe(
      'ph--building-office--regular',
    );
    await expect(select(rows[0], '[data-part="item-icon"] [data-hue]')).toHaveAttribute('data-hue', 'amber');
    await expect(within(rows[0]).getByText('Apollo')).toBeVisible();
    await expect(within(rows[0]).getByText('Active')).toBeVisible();
    await expect(within(list).queryAllByRole('button', { name: 'Drag to rearrange' })).toHaveLength(0);

    // 3. Activating a row opens its object, by click or by Enter on the highlighted row.
    await userEvent.click(within(rows[1]).getByText('Gemini'));
    await waitFor(() => expect(canvas.getByTestId('activated')).toHaveTextContent('Gemini'));
    list.focus();
    await userEvent.keyboard('{Home}{Enter}');
    await waitFor(() => expect(canvas.getByTestId('activated')).toHaveTextContent('Apollo'));

    // 4. Remove is named by its row, and deletes the reference only.
    await userEvent.click(within(list).getByRole('button', { name: 'Delete Gemini' }));
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Apollo']));

    // 5. The picker below lists the targets not yet referenced; picking one appends a row.
    await userEvent.click(select(canvasElement, '[data-scope="combobox"][data-part="trigger"]'));
    const popup = await body.findByRole('dialog');
    await expect(within(popup).queryByRole('option', { name: /Apollo/ })).toBeNull();
    await userEvent.click(within(popup).getByRole('option', { name: /Mercury/ }));
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Apollo', 'Mercury']));

    // 6. An unmatched query creates the object inline, seeded with the query, and appends it.
    await userEvent.click(select(canvasElement, '[data-scope="combobox"][data-part="trigger"]'));
    const createPopup = await body.findByRole('dialog');
    await userEvent.keyboard('Zeta');
    await userEvent.click(within(createPopup).getByRole('option', { name: 'Create “Zeta”' }));
    await expect(await within(createPopup).findByRole('textbox', { name: 'Name' })).toHaveValue('Zeta');
    await userEvent.click(within(createPopup).getByTestId('save-button'));
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Apollo', 'Mercury', 'Zeta']));
  },
};

/** 1. TestTitleOrdered: ordered title rows have drag handles, and Alt+ArrowDown on one moves its row. */
export const TestTitleOrdered: Story = {
  args: { ordered: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('listbox', { name: 'Projects' });
    const handles = within(list).getAllByRole('button', { name: 'Drag to rearrange' });
    await expect(handles).toHaveLength(2);
    handles[0].focus();
    await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Gemini', 'Apollo']));
  },
};

/** 1. TestTag: unordered chips in their hues toggle from the popup, and are not draggable. */
export const TestTag: Story = {
  args: { display: 'tag' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const row = canvas.getByTestId('items');
    await expect(within(row).getByText('Urgent').closest('[data-hue]')).toHaveAttribute('data-hue', 'rose');
    await expect(row.querySelectorAll('[draggable="true"]')).toHaveLength(0);
    await userEvent.click(select(row, '[data-scope="combobox"][data-part="trigger"]'));
    await userEvent.click(within(await body.findByRole('dialog')).getByRole('option', { name: 'Idea' }));
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Urgent', 'Later', 'Idea']));
  },
};

/** 1. TestTagOrdered: ordered chips move by Alt+Arrow when focused and by dropping one chip on another. */
export const TestTagOrdered: Story = {
  args: { display: 'tag', ordered: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = canvas.getByTestId('items');
    const chip = (label: string) => {
      const element = within(row).getByText(label).closest<HTMLElement>('[draggable="true"]');
      if (!element) {
        throw new Error(`${label} is not a draggable chip.`);
      }
      return element;
    };

    // 2. Alt+ArrowRight on a focused chip moves it one place later, and it keeps focus.
    chip('Urgent').focus();
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Later', 'Urgent']));
    await waitFor(() => expect(chip('Urgent')).toHaveFocus());

    // 3. Dropping a dragged chip on another moves it to that chip's place.
    const dataTransfer = new DataTransfer();
    chip('Urgent').dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    chip('Later').dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
    chip('Later').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    await waitFor(() => expect(readValues(canvasElement)).toEqual(['Urgent', 'Later']));
  },
};
