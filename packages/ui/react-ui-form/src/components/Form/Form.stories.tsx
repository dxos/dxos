//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Annotation, Filter, Format, Obj, Ref, Tag, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';

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
