//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo } from 'react';

import { createEchoSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { withTheme } from '@dxos/react-ui/testing';
import { ProjectionModel } from '@dxos/schema';
import { Example, testView } from '@dxos/schema/testing';

import { translations } from '../../translations';
import { FIELD_EDITOR_DEBUG_SYMBOL, TestLayout } from '../testing';

import { FieldEditor, type FieldEditorProps } from './FieldEditor';

// Type definition for debug objects exposed to tests.
export type FieldEditorDebugObjects = {
  props: FieldEditorProps;
  projection: ProjectionModel;
};

const DefaultStory = (props: FieldEditorProps) => {
  const handleComplete: FieldEditorProps['onSave'] = () => {
    log.info('onClose', { props });
  };

  // Expose objects on window for test access.
  useEffect(() => {
    props.projection.normalizeView();

    if (typeof window !== 'undefined') {
      (window as any)[FIELD_EDITOR_DEBUG_SYMBOL] = {
        props,
        projection: props.projection,
      } satisfies FieldEditorDebugObjects;
    }
  }, [props, props.projection]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ props, projection: props.projection })),
    [JSON.stringify(props), JSON.stringify(props.projection)],
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

export const Default: Story = {
  args: {
    projection: new ProjectionModel(createEchoSchema(Example).jsonSchema, testView.projection),
    field: testView.projection.fields[0],
  },
};
