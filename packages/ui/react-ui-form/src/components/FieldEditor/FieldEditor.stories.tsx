//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo } from 'react';

import { Filter, Query } from '@dxos/echo';
import { createEchoSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';
import { ProjectionModel, View, createEchoChangeCallback } from '@dxos/schema';
import { Example } from '@dxos/schema/testing';

import { translations } from '../../translations';
import { FIELD_EDITOR_DEBUG_SYMBOL, TestLayout } from '../testing';

import { FieldEditor, type FieldEditorProps } from './FieldEditor';

// Type definition for debug objects exposed to tests.
export type FieldEditorDebugObjects = {
  props: FieldEditorProps;
  projection: ProjectionModel;
};

/**
 * Create test view and projection at render time to avoid issues with
 * ECHO objects being created at module load time.
 */
const useTestProjection = () => {
  return useMemo(() => {
    const schema = createEchoSchema(Example);
    const view = View.make({
      name: 'Test',
      query: Query.select(Filter.type(Example)),
      jsonSchema: schema.jsonSchema,
    });
    const projection = new ProjectionModel({
      view,
      baseSchema: schema.jsonSchema,
      change: createEchoChangeCallback(view, schema),
    });
    projection.normalizeView();
    return { view, projection };
  }, []);
};

const DefaultStory = () => {
  const { view, projection } = useTestProjection();

  const handleComplete: FieldEditorProps['onSave'] = () => {
    log.info('onClose');
  };

  const props: FieldEditorProps = {
    projection,
    field: view.projection.fields[0],
  };

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)[FIELD_EDITOR_DEBUG_SYMBOL] = {
        props,
        projection,
      } satisfies FieldEditorDebugObjects;
    }
  }, [props, projection]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ props, projection })),
    [JSON.stringify(props), JSON.stringify(projection)],
  );

  return (
    <TestLayout json={json}>
      <FieldEditor {...props} onSave={handleComplete} />
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/FieldEditor',
  component: FieldEditor as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
    controls: {
      disabled: true,
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
