//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Annotation, Filter, Format, Obj, Ref, Tag, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Toolbar, Tooltip } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

import { AutofillAnnotation, OptionsLookupAnnotation, autofill, optionsLookup } from '../../annotations';
import { Organization, Person, TestLayout } from '../../testing';
import { type ExcludeId, omitId } from '../../util';
import { Form, type FormRootProps } from './Form';

type StoryArgs<T extends AnyProperties> = FormRootProps<T> & { json?: boolean };

const DefaultStory = <T extends AnyProperties = AnyProperties>({
  schema,
  values: valuesProp,
  json = true,
  ...props
}: StoryArgs<T>) => {
  const [values, setValues] = useState<Partial<T>>(valuesProp ?? {});
  const spaces = useSpaces();
  const space = spaces[0];

  const handleSave = useCallback<NonNullable<FormRootProps<T>['onSave']>>((values) => {
    log.info('save', { values, meta });
    setValues(values);
  }, []);

  const handleCancel = useCallback<NonNullable<FormRootProps<T>['onCancel']>>(() => {
    log.info('cancel');
    setValues(valuesProp ?? {});
  }, []);

  if (!space) {
    return <Loading />;
  }

  return (
    <Tooltip.Provider>
      <TestLayout json={json ? { values, schema: schema?.ast } : undefined}>
        <Form.Root
          schema={schema}
          defaultValues={values}
          db={space.db}
          onSave={handleSave}
          onCancel={handleCancel}
          {...props}
        >
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Section title='Section' description='This is a [section description](https://dxos.org).' />
              <Form.FieldSet />
              <Form.Actions />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </TestLayout>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-form/Form',
  component: Form.Root,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Tag.Tag, Organization, Person, Text.Text],
      onCreateSpace: ({ space }) => {
        [
          ...Array.from({ length: 3 }).map((_, i) => Obj.make(Tag.Tag, { label: `Tag ${i}` })),
          ...Array.from({ length: 50 }).map((_, i) => Obj.make(Organization, { name: `Organization ${i}` })),
          Obj.make(Text.Text, { content: '# Brief\n\nEdit this **inline** markdown text.' }),
        ].map((obj) => space.db.add(obj));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryArgs<any>>;

export default meta;

const PersonSchema = Type.getSchema(Person);

const values: Partial<Person> = {
  name: 'Alice',
  location: [40.7128, -74.006],
  tasks: ['task 1', 'task 2'],
  birthday: '1990-05-12',
  meetingAt: '2026-06-01T15:30:00.000Z',
  reminderAt: '09:00:00',
};

type Story<T extends AnyProperties> = StoryObj<StoryArgs<T>>;

/**
 * Build a data-entry surface by handing an Effect schema to `Form.Root` — the form derives its fields,
 * types, validation, and selects from the schema, so you don't hand-wire one control per property.
 * Customize individual fields with `fieldMap` (keyed by JSON path), render discriminated unions
 * conditionally via the discriminator, and label ref-picker options by their parent object with
 * `ParentLabelAnnotation`.
 *
 * @idiom org.dxos.react-ui-form.schemaForm
 *   applies: Any data-entry section bound to an Effect schema — settings, object/article editors, create dialogs
 *   instead-of: Hand-wiring Input/Select/Switch controls per field in bespoke React
 *   uses: {@link Form.Root}, {@link Form.FieldSet}
 *   related: org.dxos.react-ui-menu.toolbarMenu
 */
export const Default: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    autoSave: true,
  },
};

export const Readonly: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    readonly: true,
  },
};

export const Static: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    layout: 'static',
  },
};

const SettingsSchema = Schema.mutable(
  Schema.Struct({
    viewMode: Schema.Literal('preview', 'readonly', 'source').annotations({
      title: 'Default view mode',
      description: 'Set whether documents open in editing or read-only mode.',
    }),
    toolbar: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Show toolbar',
        description: 'Display a formatting toolbar above the editor.',
      }),
    ),
    fontSize: Schema.optional(
      Schema.Number.annotations({ title: 'Font size', description: 'Editor font size, in pixels.' }),
    ),
  }),
);

export const Variants: Story<Schema.Schema.Type<typeof SettingsSchema>> = {
  render: (args) => (
    <div className='grid grid-cols-2 w-full'>
      <DefaultStory {...args} />
      <DefaultStory {...args} variant='settings' />
    </div>
  ),
  args: {
    json: false,
    schema: SettingsSchema,
    values: {
      viewMode: 'preview',
      toolbar: true,
      fontSize: 14,
    },
  },
};

const InlineMarkdownTextSchema = Schema.mutable(
  Schema.Struct({
    text: Schema.String,
    instructions: Ref.Ref(Text.Text).pipe(
      Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
      Annotation.FormInlineAnnotation.set(true),
      Schema.annotations({
        title: 'Instructions',
        description: 'Ref to a Text object with both markdown and inline-ref annotations.',
      }),
    ),
  }),
);

const InlineMarkdownTextStory = (args: StoryArgs<any>) => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [text] = useQuery(space?.db, Filter.type(Text.Text));
  const values = useMemo(() => (text ? { instructions: Ref.make(text) } : undefined), [text]);

  if (!space || !values) {
    return <Loading />;
  }

  return (
    <DefaultStory
      {...args}
      schema={InlineMarkdownTextSchema}
      values={values}
      onCreate={(_type, props) => space.db.add(Obj.make(Text.Text, { content: '', ...props }))}
    />
  );
};

/**
 * Exercises a `Ref<Text>` field carrying both `Format.TypeFormat.Markdown` and
 * `FormInlineAnnotation` — the markdown editor should render inline rather than
 * opening a ref picker or nested struct form.
 */
export const InlineMarkdownText: Story<any> = {
  render: (args) => <InlineMarkdownTextStory {...args} />,
  args: {
    autoSave: true,
  },
};

export const Empty: Story<ExcludeId<typeof PersonSchema>> = {
  args: {},
};

// Demonstrates the value-driven dynamic-field annotations (here backed by in-memory Effects with an
// artificial delay rather than network calls, so the story is deterministic): a select whose options
// derive from the `query` field, and a text field auto-filled from the `url` field. Each annotation
// declares the fields it depends on, so it only re-runs when one of those changes. Structural validation
// is the schema's own job (`Format.URL`).
const isValidUrl = Schema.is(Format.URL);

// Base struct (no dynamic annotations) — its value type drives the typed `deps`/`values` below.
const DynamicFieldsBase = Schema.Struct({
  query: Schema.String.annotations({ title: 'Query', description: 'Type to load the choices below.' }),
  choice: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
  url: Format.URL.annotations({ title: 'URL', description: 'A valid URL auto-fills the name below.' }),
  name: Schema.optional(Schema.String),
});
type DynamicFieldsValues = Schema.Schema.Type<typeof DynamicFieldsBase>;

const TAG_VOCABULARY = ['react', 'effect', 'schema', 'echo', 'composer'];

const DynamicFieldsSchema = Schema.mutable(
  Schema.Struct({
    ...DynamicFieldsBase.fields,
    choice: Schema.optional(
      Schema.String.pipe(
        OptionsLookupAnnotation.set(
          optionsLookup<DynamicFieldsValues>()(['query'], ({ query }) =>
            (query && query.length > 0
              ? Effect.succeed(
                  [1, 2, 3].map((index) => ({ value: `${query}-${index}`, label: `${query} choice ${index}` })),
                )
              : Effect.succeed([])
            ).pipe(Effect.delay('600 millis')),
          ),
        ),
        Schema.annotations({ title: 'Choice', description: 'Options load from the query (after a delay).' }),
      ),
    ),
    // Combobox: the field's own value is the query; the typed text is the auto-selected first option.
    tag: Schema.optional(
      Schema.String.pipe(
        OptionsLookupAnnotation.set(
          optionsLookup<DynamicFieldsValues>()(
            // No deps: the pool is fetched once; the combobox filters it by the typed text client-side.
            [],
            () =>
              Effect.succeed(TAG_VOCABULARY.map((value) => ({ value, label: value }))).pipe(Effect.delay('400 millis')),
            { combobox: true },
          ),
        ),
        Schema.annotations({ title: 'Tag', description: 'Combobox: type to filter; your text stays selectable.' }),
      ),
    ),
    name: Schema.optional(
      Schema.String.pipe(
        // Only derive a value once the URL is structurally valid, and only after the artificial wait —
        // an incomplete/invalid URL produces nothing.
        AutofillAnnotation.set(
          autofill<DynamicFieldsValues>()(['url'], ({ url }) =>
            isValidUrl(url)
              ? Effect.succeed(`Feed for ${url}`).pipe(Effect.delay('800 millis'))
              : Effect.succeed(undefined),
          ),
        ),
        Schema.annotations({ title: 'Name', description: 'Auto-filled from a valid URL (editable).' }),
      ),
    ),
  }),
);

/**
 * Exercises the dynamic-field annotations: `OptionsLookupAnnotation` (select options loaded from a
 * sibling) and `AutofillAnnotation` (value derived from a sibling, gated on validity and delayed). Each
 * runs a self-contained Effect from the current form values.
 */
export const DynamicFields: Story<Schema.Schema.Type<typeof DynamicFieldsSchema>> = {
  args: {
    json: true,
    schema: DynamicFieldsSchema,
  },
};

// Discriminated-union create form mirroring the magazine create-feed schema: a `type` selector picks the
// member, whose fields then render — `standard-site` (handle combobox → publication select) or `rss`
// (URL → auto-filled name). Backed by in-memory Effects so the story is deterministic. Regression harness
// for union create forms (e.g. the `omitId` union-flattening bug).
const HANDLE_SUGGESTIONS = ['dxos.org', 'alice.bsky.social', 'bob.example.com'];

const StandardSiteCreateBase = Schema.Struct({
  type: Schema.Literal('standard-site'),
  handle: Schema.String.annotations({ title: 'Handle', description: 'atproto handle, e.g. dxos.org.' }),
  // No `name`: the feed name is taken from the selected publication.
  publication: Schema.String.annotations({ title: 'Publication', description: 'Choose a publication.' }),
});
type StandardSiteValues = Schema.Schema.Type<typeof StandardSiteCreateBase>;

const StandardSiteCreate = Schema.Struct({
  ...StandardSiteCreateBase.fields,
  handle: StandardSiteCreateBase.fields.handle.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<StandardSiteValues>()(
        ['handle'],
        () =>
          Effect.succeed(HANDLE_SUGGESTIONS.map((value) => ({ value, label: value }))).pipe(Effect.delay('300 millis')),
        { combobox: true },
      ),
    ),
  ),
  publication: StandardSiteCreateBase.fields.publication.pipe(
    OptionsLookupAnnotation.set(
      optionsLookup<StandardSiteValues>()(['handle'], ({ handle }) =>
        Effect.succeed(
          handle
            ? [
                { value: `at://${handle}/pub/blog`, label: `${handle} — Blog` },
                { value: `at://${handle}/pub/notes`, label: `${handle} — Notes` },
              ]
            : [],
        ).pipe(Effect.delay('300 millis')),
      ),
    ),
  ),
});

const RssCreateBase = Schema.Struct({
  type: Schema.Literal('rss'),
  url: Format.URL.annotations({ title: 'URL', description: 'RSS feed URL.' }),
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
});
type RssValues = Schema.Schema.Type<typeof RssCreateBase>;

const RssCreate = Schema.Struct({
  ...RssCreateBase.fields,
  name: Schema.optional(
    Schema.String.pipe(
      AutofillAnnotation.set(
        autofill<RssValues>()(['url'], ({ url }) =>
          isValidUrl(url)
            ? Effect.succeed(`Feed for ${url}`).pipe(Effect.delay('500 millis'))
            : Effect.succeed(undefined),
        ),
      ),
    ).annotations({ title: 'Name' }),
  ),
});

const CreateFeedSchema = Schema.Union(StandardSiteCreate, RssCreate);

/**
 * A discriminated-union create form: selecting `type` reveals that member's fields (combobox + select for
 * `standard-site`, URL + autofill for `rss`). Mirrors the magazine create-feed schema.
 */
export const DiscriminatedUnion: Story<Schema.Schema.Type<typeof CreateFeedSchema>> = {
  args: {
    json: true,
    schema: CreateFeedSchema,
  },
};

// Reactive-source + local-buffer pattern: `values` is a live source, and a parent that gates persistence on
// validity (like the selected-objects `ObjectForm`). `counter` ticks once a second from outside the form to
// stand in for an external mutation.
const ReactiveSchema = Schema.mutable(
  Schema.Struct({
    name: Schema.NonEmptyString.annotations({
      title: 'Name',
      description: 'Required — clear it and the form holds the invalid draft instead of snapping back.',
    }),
    counter: Schema.Number.annotations({
      title: 'Counter',
      description: 'Ticks every second from an external source; updates live even while you edit Name.',
    }),
  }),
);
type ReactiveValues = Schema.Schema.Type<typeof ReactiveSchema>;

const ReactiveBufferedStory = () => {
  const [source, setSource] = useState<Partial<ReactiveValues>>({ name: 'Alice', counter: 0 });
  const [running, setRunning] = useState(true);

  const tick = useCallback(() => setSource((prev) => ({ ...prev, counter: (prev.counter ?? 0) + 1 })), []);

  // External source of truth: tick the counter outside the form while running. Stop it to edit the counter by hand.
  useEffect(() => {
    if (!running) {
      return;
    }
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [running, tick]);

  // Persist only valid changes (mirrors ObjectForm): invalid intermediate edits stay buffered in the form.
  const handleValuesChanged = useCallback<NonNullable<FormRootProps<ReactiveValues>['onValuesChanged']>>(
    (values, { isValid }) => {
      if (!isValid) {
        return;
      }
      setSource((prev) => ({ ...prev, ...values }));
    },
    [],
  );

  return (
    <Tooltip.Provider>
      <TestLayout json={{ source }}>
        <div className='flex flex-col bs-full'>
          <Toolbar.Root>
            <Toolbar.IconButton
              icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
              label={running ? 'Stop external ticks' : 'Start external ticks'}
              onClick={() => setRunning((value) => !value)}
            />
            <Toolbar.IconButton
              icon='ph--plus--regular'
              label='Tick counter once (external)'
              disabled={running}
              onClick={tick}
            />
          </Toolbar.Root>
          <Form.Root schema={ReactiveSchema} values={source} onValuesChanged={handleValuesChanged}>
            <Form.Viewport>
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        </div>
      </TestLayout>
    </Tooltip.Provider>
  );
};

/**
 * Demonstrates the reactive-source + local-buffer pattern used by the selected-objects companion. Pass a live
 * object as `values` and gate persistence on validity in `onValuesChanged`. Watch the `Counter` field update
 * live from the external tick while you clear `Name`: the form holds the invalid draft (shows the error) without
 * snapping back, and the external counter keeps flowing in. Fixing `Name` commits it and reconciles.
 *
 * Use the toolbar to stop the external ticks (then edit `Counter` by hand, or step it once with the `+` button)
 * to see manual edits and external updates reconcile through the same path.
 *
 * @idiom org.dxos.react-ui-form.reactiveBufferedForm
 *   applies: Editing a live/remote object where fields can change externally mid-edit (object/article editors, companions)
 *   instead-of: Uncontrolled `defaultValues` (ignores external changes) or naive controlled `values` (snaps invalid input back)
 *   uses: {@link Form.Root}
 */
export const ReactiveBuffered: Story<ReactiveValues> = {
  render: () => <ReactiveBufferedStory />,
};
