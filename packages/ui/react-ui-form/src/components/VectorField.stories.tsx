//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { withTheme } from '@dxos/react-ui/testing';
import * as Typography from '@dxos/react-ui/Typography';
import { VectorAnnotationId } from '@dxos/ui-types';

import { type FormPresentation } from '#types';

import { StepAnnotation } from '../annotations.ts';
import { type PaneArgs, nextTranslations, withNextPane } from '../testing/next-pane.tsx';
import { Form } from './Form.tsx';

// The shapes a model schema marks as vectors by the annotation id alone, as `@dxos/scene` does.
const Vec2 = Schema.Struct({ x: Schema.Number, y: Schema.Number }).annotate({ [VectorAnnotationId]: true });
const Vec3 = Schema.Struct({ x: Schema.Number, y: Schema.Number, z: Schema.Number }).annotate({
  [VectorAnnotationId]: true,
});
const Size2 = Schema.Struct({ width: Schema.Number, height: Schema.Number }).annotate({ [VectorAnnotationId]: true });

const ElementSchema = Schema.Struct({
  name: Schema.String.annotate({ title: 'Name' }),
  center: Vec2.annotate({ title: 'Center' }),
  size: Size2.annotate({ title: 'Size' }),
  position: Vec3.annotate({ title: 'Position' }),
  // An axis's own step still applies: rotation moves by 15 degrees.
  rotation: Schema.Struct({
    x: Schema.Number.pipe(StepAnnotation.set(15)),
    y: Schema.Number.pipe(StepAnnotation.set(15)),
    z: Schema.Number.pipe(StepAnnotation.set(15)),
  }).annotate({ title: 'Rotation', [VectorAnnotationId]: true }),
  scale: Schema.optional(Vec3.annotate({ title: 'Scale' })),
}).mapFields(Struct.map(Schema.mutableKey));

type Values = Schema.Schema.Type<typeof ElementSchema>;

type StoryArgs = PaneArgs & {
  readonly?: boolean;
  layout?: FormPresentation;
  commitOn?: 'change' | 'blur';
};

const DefaultStory = ({ readonly, layout, commitOn }: StoryArgs) => {
  const [values, setValues] = useState<Values>({
    name: 'Box',
    center: { x: 0, y: 1 },
    size: { width: 120, height: 80 },
    position: { x: 0, y: 1, z: 0 },
    rotation: { x: 0, y: 45, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
  return (
    <Panel.Root>
      <Panel.Body asChild>
        <ScrollArea.Root>
          <ScrollArea.Viewport asChild>
            <Layout.Container>
              <Form.Root
                schema={ElementSchema}
                values={values}
                readonly={readonly}
                layout={layout}
                commitOn={commitOn}
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
  title: 'ui/react-ui-form/VectorField',
  render: DefaultStory,
  // As narrow as a properties panel, where the axes must still sit beside their labels.
  decorators: [withTheme(), withNextPane({ width: '20rem', height: '48rem' })],
  parameters: { layout: 'fullscreen', translations: nextTranslations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReadOnly: Story = { args: { readonly: true } };

export const Static: Story = { args: { layout: 'static' } };

const readValues = (canvasElement: HTMLElement): Partial<Values> =>
  JSON.parse(within(canvasElement).getByTestId('values').textContent ?? '{}');

/** 1. Test: each axis is labelled by its name, and editing y commits on blur and writes only y. */
export const Test: Story = {
  args: { commitOn: 'blur' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 2. The axes stack under the vector's label, labelled x, y, z (and w, h for a size).
    const position = canvas.getByRole('group', { name: 'Position' });
    const axes = within(position).getAllByRole('spinbutton');
    await expect(axes.map((axis) => axis.getAttribute('aria-label'))).toEqual(['x', 'y', 'z']);
    const size = canvas.getByRole('group', { name: 'Size' });
    await expect(
      within(size)
        .getAllByRole('spinbutton')
        .map((axis) => axis.getAttribute('aria-label')),
    ).toEqual(['w', 'h']);

    // 3. A typed value waits for the blur, then writes only its own axis.
    const y = within(position).getByRole('spinbutton', { name: 'y' });
    await userEvent.tripleClick(y);
    await userEvent.keyboard('7');
    await expect(readValues(canvasElement).position).toEqual({ x: 0, y: 1, z: 0 });
    await userEvent.tab();
    await waitFor(() => expect(readValues(canvasElement).position).toEqual({ x: 0, y: 7, z: 0 }));
  },
};
