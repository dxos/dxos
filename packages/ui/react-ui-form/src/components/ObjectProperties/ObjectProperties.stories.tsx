//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useEffect } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Annotation, Filter, Obj, Ref, Tag, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { FactoryAnnotation, type FactoryFn } from '@dxos/schema';
import { Pipeline } from '@dxos/types';

import { translations } from '../../translations';
import { OBJECT_PROPERTIES_DEBUG_SYMBOL } from '../testing';
import { ObjectProperties } from './ObjectProperties';

//
// Test-only schemas exercising a non-Tag ref-array. `Article.authors` is the
// case the generic create flow currently fails on: the picker creates an
// Author in the DB but never wires the new Ref into the array slot.
//

const Author = Schema.Struct({
  name: Schema.String,
}).pipe(
  Type.object({
    typename: 'org.dxos.test.author',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--user--regular', hue: 'blue' }),
);
type Author = Schema.Schema.Type<typeof Author>;

const Article = Schema.Struct({
  title: Schema.String.pipe(Schema.optional),
  authors: Schema.Array(Ref.Ref(Author)),
}).pipe(
  Type.object({
    typename: 'org.dxos.test.article',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--article--regular', hue: 'green' }),
);
type Article = Schema.Schema.Type<typeof Article>;

//
// `Note` mirrors the `Subscription.Feed` shape: a required `Ref` field
// (`backing`) is hidden from the form via `FormInputAnnotation.set(false)`,
// so `Obj.make(Note, values)` from the picker would reject because the form
// values can't satisfy the schema. A `FactoryAnnotation` constructs the
// backing object and links it at create time. `cursor` is an optional hidden
// field included to exercise the same path for non-required hidden fields.
//
const NoteBacking = Schema.Struct({}).pipe(Type.object({ typename: 'org.dxos.test.note-backing', version: '0.1.0' }));
type NoteBacking = Schema.Schema.Type<typeof NoteBacking>;

const Note = Schema.Struct({
  title: Schema.String,
  cursor: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  backing: Ref.Ref(NoteBacking).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.test.note',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--note--regular', hue: 'amber' }),
  FactoryAnnotation.set(((values: any) =>
    Obj.make(Note, { ...values, backing: Ref.make(Obj.make(NoteBacking, {})) })) as FactoryFn),
);
type Note = Schema.Schema.Type<typeof Note>;

const Notebook = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  notes: Schema.Array(Ref.Ref(Note)),
}).pipe(
  Type.object({
    typename: 'org.dxos.test.notebook',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--notebook--regular', hue: 'amber' }),
);
type Notebook = Schema.Schema.Type<typeof Notebook>;

//
// Stories.
//

export type ObjectPropertiesDebug = {
  /** Live database the story is rendering against. */
  db: ReturnType<typeof useClientStory>['space'] extends infer S ? (S extends { db: infer D } ? D : never) : never;
  /** Object whose properties are being edited. */
  object: Obj.Unknown;
};

const PipelineStory = () => {
  const { space } = useClientStory();
  const [object] = useQuery(space?.db, Filter.type(Pipeline.Pipeline));

  useEffect(() => {
    if (typeof window !== 'undefined' && space?.db && object) {
      (window as any)[OBJECT_PROPERTIES_DEBUG_SYMBOL] = { db: space.db, object } satisfies ObjectPropertiesDebug;
    }
  }, [space, object]);

  if (!object) {
    return <Loading />;
  }
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={object} />
      </Panel.Content>
    </Panel.Root>
  );
};

const ArticleStory = () => {
  const { space } = useClientStory();
  const [object] = useQuery(space?.db, Filter.type(Article));

  useEffect(() => {
    if (typeof window !== 'undefined' && space?.db && object) {
      (window as any)[OBJECT_PROPERTIES_DEBUG_SYMBOL] = { db: space.db, object } satisfies ObjectPropertiesDebug;
    }
  }, [space, object]);

  if (!object) {
    return <Loading />;
  }
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={object} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/ObjectProperties',
  component: ObjectProperties as any,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof PipelineStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const pipelineDecorators = [
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types: [Pipeline.Pipeline, Tag.Tag],
    onCreateSpace: async ({ space }) => {
      space.db.add(Pipeline.make());
      space.db.add(Tag.make({ label: 'Tag 1' }));
      space.db.add(Tag.make({ label: 'Tag 2' }));
      space.db.add(Tag.make({ label: 'Tag 3' }));
    },
  }),
];

const articleDecorators = [
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types: [Article, Author, Tag.Tag],
    onCreateSpace: async ({ space }) => {
      space.db.add(Obj.make(Article, { title: 'Untitled article', authors: [] }));
    },
  }),
];

const NotebookStory = () => {
  const { space } = useClientStory();
  const [object] = useQuery(space?.db, Filter.type(Notebook));

  useEffect(() => {
    if (typeof window !== 'undefined' && space?.db && object) {
      (window as any)[OBJECT_PROPERTIES_DEBUG_SYMBOL] = { db: space.db, object } satisfies ObjectPropertiesDebug;
    }
  }, [space, object]);

  if (!object) {
    return <Loading />;
  }
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={object} />
      </Panel.Content>
    </Panel.Root>
  );
};

const notebookDecorators = [
  withClientProvider({
    createIdentity: true,
    createSpace: true,
    types: [Notebook, Note, NoteBacking, Tag.Tag],
    onCreateSpace: async ({ space }) => {
      space.db.add(Obj.make(Notebook, { name: 'Untitled notebook', notes: [] }));
    },
  }),
];

/**
 * Default Pipeline form — manual exploration. Includes the Tags picker (which
 * is the only ref-array path that currently works end-to-end, by virtue of
 * `Tag.Tag` being special-cased in `ObjectProperties.handleCreate`).
 */
export const Default: Story = {
  render: PipelineStory,
  decorators: pipelineDecorators,
};

/**
 * Tag-creation play. Walks the inline create flow against the Tags picker and
 * leaves the magazine in the post-Save state for assertions to inspect via
 * `OBJECT_PROPERTIES_DEBUG_SYMBOL`.
 *
 * Expected end-state (currently passes):
 *   - new Tag.Tag exists in the DB with `label === "PinnedTag"`
 *   - `Obj.getMeta(object).tags` includes its DXN.
 */
export const CreateTagPlay: Story = {
  render: PipelineStory,
  decorators: pipelineDecorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Tags is `Schema.Array(Ref.Ref(Tag.Tag))` and starts empty, so it renders
    // as an "Add item" button — same shape as any other ref-array. Click it
    // to materialise an empty slot, then open the slot's picker.
    const addButton = await canvas.findByRole('button', { name: /add/i }, { timeout: 10_000 });
    await userEvent.click(addButton);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const comboboxes = await canvas.findAllByRole('combobox', undefined, { timeout: 10_000 });
    await expect(comboboxes.length).toBeGreaterThan(0);
    await userEvent.click(comboboxes[0]);

    const search = await body.findByPlaceholderText(/search/i, undefined, { timeout: 5000 });
    await userEvent.type(search, 'PinnedTag');

    // The Tag picker localises the create option as "Add tag" (no text suffix
    // — the translation has no `{{text}}` placeholder), so match on /add/.
    const createOption = await body.findByRole('option', { name: /add/i }, { timeout: 3000 });
    await userEvent.click(createOption);

    const form = await body.findByTestId('create-referenced-object-form', undefined, { timeout: 5000 });
    const labelInput = await within(form).findByLabelText(/^label$/i);
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, 'PinnedTag');
    await userEvent.click(await within(form).findByTestId('save-button'));

    // Allow async state updates to flush before the test asserts.
    await new Promise((resolve) => setTimeout(resolve, 250));
  },
};

/**
 * Ref-array creation play. Walks Add → Open → Create → Save against
 * `Article.authors`. After the fix, the new Author should be persisted AND
 * wired into `article.authors[0]`. Today it persists to the DB but the array
 * slot stays empty.
 */
export const CreateRefArrayPlay: Story = {
  render: ArticleStory,
  decorators: articleDecorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // ObjectProperties extends Article with the BaseSchema's `tags` array, so
    // the form has two "Add item" buttons (Tags + Authors). Pick the last one
    // — Authors comes after Tags in the rendered order.
    const addButtons = await canvas.findAllByRole('button', { name: /add/i }, { timeout: 10_000 });
    await userEvent.click(addButtons[addButtons.length - 1]);
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Open the empty slot's combobox.
    const comboboxes = await canvas.findAllByRole('combobox', undefined, { timeout: 10_000 });
    await expect(comboboxes.length).toBeGreaterThan(0);
    await userEvent.click(comboboxes[0]);

    const search = await body.findByPlaceholderText(/search/i, undefined, { timeout: 5000 });
    await userEvent.type(search, 'Ada Lovelace');

    // Author has no `createOptionLabel` → option falls back to "Create".
    const createOption = await body.findByRole('option', { name: /create/i }, { timeout: 3000 });
    await userEvent.click(createOption);

    const form = await body.findByTestId('create-referenced-object-form', undefined, { timeout: 5000 });
    const nameInput = await within(form).findByLabelText(/^name$/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Ada Lovelace');
    await userEvent.click(await within(form).findByTestId('save-button'));

    await new Promise((resolve) => setTimeout(resolve, 250));
  },
};

/**
 * Ref-array creation against a schema with a hidden required field. `Note`
 * mirrors the shape of `Subscription.Feed`: the form omits `backing` (a
 * required `Ref` annotated `FormInputAnnotation.set(false)`) but the schema
 * requires it. Without `omitHiddenFormFields` + `FactoryAnnotation`, the
 * form's validator would reject Save and the popover would never close.
 *
 * Expected end-state after the fix:
 *   - new Note exists in DB with a synthesised `backing` ref
 *   - `notebook.notes[0]` references the new Note
 *   - the create form is gone
 */
export const CreateHiddenFieldPlay: Story = {
  render: NotebookStory,
  decorators: notebookDecorators,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Two "Add item" buttons (Tags + Notes) — Notes comes second.
    const addButtons = await canvas.findAllByRole('button', { name: /add/i }, { timeout: 10_000 });
    await userEvent.click(addButtons[addButtons.length - 1]);
    await new Promise((resolve) => setTimeout(resolve, 250));

    const comboboxes = await canvas.findAllByRole('combobox', undefined, { timeout: 10_000 });
    await expect(comboboxes.length).toBeGreaterThan(0);
    await userEvent.click(comboboxes[0]);

    const search = await body.findByPlaceholderText(/search/i, undefined, { timeout: 5000 });
    await userEvent.type(search, 'Ideas');

    const createOption = await body.findByRole('option', { name: /create/i }, { timeout: 3000 });
    await userEvent.click(createOption);

    const form = await body.findByTestId('create-referenced-object-form', undefined, { timeout: 5000 });
    const titleInput = await within(form).findByLabelText(/^title$/i);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Ideas');
    await userEvent.click(await within(form).findByTestId('save-button'));

    await new Promise((resolve) => setTimeout(resolve, 250));
  },
};
