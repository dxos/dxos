//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Annotation, Format, Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';
import { hues } from '@dxos/ui-types';

import { AutofillAnnotation, HueAnnotation, OptionsLookupAnnotation, autofill, optionsLookup } from '../annotations.ts';
import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Organization } from '../testing/schema.ts';
import { Form } from './Form.tsx';

const isValidUrl = Schema.is(Format.URL);

const Base = Schema.Struct({
  query: Schema.optional(Schema.String.annotate({ title: 'Query', description: 'Loads the choices below.' })),
  choice: Schema.optional(Schema.String),
  tag: Schema.optional(Schema.String),
  url: Schema.optional(Format.URL.annotate({ title: 'URL', description: 'A valid URL fills the name below.' })),
  name: Schema.optional(Schema.String),
});

type BaseValues = Schema.Schema.Type<typeof Base>;

const TAGS = ['react', 'effect', 'schema', 'echo', 'composer'];

/** Every annotation-driven renderer: options lookup (Select and Combobox), autofill, hue, a key, an inline ref. */
const AnnotatedSchema = Schema.Struct({
  ...Base.fields,
  choice: Schema.optional(
    Schema.String.pipe(
      OptionsLookupAnnotation.set(
        optionsLookup<BaseValues>()(['query'], ({ query }) =>
          Effect.succeed(
            query ? [1, 2, 3].map((index) => ({ value: `${query}-${index}`, label: `${query} choice ${index}` })) : [],
          ).pipe(Effect.delay('50 millis')),
        ),
      ),
      Schema.annotate({ title: 'Choice' }),
    ),
  ),
  tag: Schema.optional(
    Schema.String.pipe(
      OptionsLookupAnnotation.set(
        optionsLookup<BaseValues>()([], () => Effect.succeed(TAGS.map((value) => ({ value, label: value }))), {
          combobox: true,
        }),
      ),
      Schema.annotate({ title: 'Tag' }),
    ),
  ),
  name: Schema.optional(
    Schema.String.pipe(
      AutofillAnnotation.set(
        autofill<BaseValues>()(['url'], ({ url }) =>
          Effect.succeed(isValidUrl(url) ? `Feed for ${url}` : undefined).pipe(Effect.delay('50 millis')),
        ),
      ),
      Schema.annotate({ title: 'Name' }),
    ),
  ),
  accent: Schema.optional(Schema.Literals(hues).pipe(HueAnnotation.set(true), Schema.annotate({ title: 'Accent' }))),
  apiKey: Schema.optional(
    Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Key)).annotate({ title: 'API key' }),
  ),
  employer: Schema.optional(
    Ref.Ref(Organization).pipe(Annotation.FormInlineAnnotation.set(true)).annotate({ title: 'Employer' }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

type Values = Schema.Schema.Type<typeof AnnotatedSchema>;

const DefaultStory = (_: PaneArgs) => {
  // A local object: the inline form edits it through its ref, with no database.
  const organization = useMemo(() => Obj.make(Organization, { name: 'Acme' }), []);
  const [organizationName] = useObject(organization, 'name');
  const [values, setValues] = useState<Values>(() => ({ apiKey: 'sk-1234', employer: Ref.make(organization) }));
  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              <Form.Root
                schema={AnnotatedSchema}
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
          {JSON.stringify({ ...values, employer: undefined })}
        </Typography.Text>
        <Typography.Text truncate data-testid='organization'>
          {organizationName}
        </Typography.Text>
      </Panel.Footer>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-form/Annotated',
  render: DefaultStory,
  decorators: [withTheme(), withNextPane({ height: '48rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<PaneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const readValues = (canvasElement: HTMLElement): Partial<Values> =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** 1. Test: lookups load and pick, autofill fills, a hue is chosen, a key is monospace, an inline ref edits its target. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);

    // 2. Options lookup (Select): the choices load from the query.
    await userEvent.type(canvas.getByRole('textbox', { name: 'Query' }), 'ab');
    const choice = canvas.getByRole('combobox', { name: 'Choice' });
    await waitFor(() => expect(choice).not.toHaveAttribute('aria-busy', 'true'));
    await userEvent.click(choice);
    await userEvent.click(await body.findByRole('option', { name: 'ab choice 2' }));
    await waitFor(() => expect(readValues(canvasElement).choice).toBe('ab-2'));

    // 3. Options lookup (Combobox): typing narrows the suggestions; free text is kept too.
    const tag = canvas.getByRole('combobox', { name: 'Tag' });
    await userEvent.type(tag, 'eff');
    await expect(await body.findByRole('option', { name: 'effect' })).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(readValues(canvasElement).tag).toBe('effect'));
    await userEvent.clear(tag);
    await userEvent.type(tag, 'custom');
    await userEvent.click(await body.findByRole('option', { name: 'custom' }));
    await waitFor(() => expect(readValues(canvasElement).tag).toBe('custom'));

    // 4. Autofill: a valid URL fills the name.
    await userEvent.type(canvas.getByRole('textbox', { name: 'URL' }), 'https://dxos.org');
    await waitFor(() => expect(readValues(canvasElement).name).toBe('Feed for https://dxos.org'));

    // 5. Hue: a Select of hue swatches.
    await userEvent.click(canvas.getByRole('combobox', { name: 'Accent' }));
    await userEvent.click(await body.findByRole('option', { name: 'Amber' }));
    await waitFor(() => expect(readValues(canvasElement).accent).toBe('amber'));

    // 6. Key format: a monospace input.
    await expect(getComputedStyle(canvas.getByRole('textbox', { name: 'API key' })).fontFamily).toMatch(/mono/i);

    // 7. Inline ref: the target's fields as a nested group that writes back to the target.
    const employer = canvas.getByRole('group', { name: 'Employer' });
    const name = within(employer).getByRole('textbox', { name: 'Full name' });
    await expect(name).toHaveValue('Acme');
    await userEvent.type(name, ' Corp');
    await waitFor(() => expect(canvas.getByTestId('organization')).toHaveTextContent('Acme Corp'));
  },
};
