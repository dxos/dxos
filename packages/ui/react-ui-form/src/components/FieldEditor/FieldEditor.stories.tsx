//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo } from 'react';

import { createEchoSchema } from '@dxos/live-object/testing';
import { log } from '@dxos/log';
import { ProjectionModel } from '@dxos/schema';
import { TestSchema, testView } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { FIELD_EDITOR_DEBUG_SYMBOL, TestLayout, TestPanel } from '../testing';

import { FieldEditor, type FieldEditorProps } from './FieldEditor';

// Type definition for debug objects exposed to tests.
export type FieldEditorDebugObjects = {
  props: FieldEditorProps;
  projection: ProjectionModel;
};

type StoryProps = FieldEditorProps;

const DefaultStory = (props: FieldEditorProps) => {
  const handleComplete: FieldEditorProps['onSave'] = () => {
    log.info('onClose', { props });
  };

  // Expose objects on window for test access.
  useEffect(() => {
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
      <TestPanel>
        <FieldEditor {...props} onSave={handleComplete} />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-form/FieldEditor',
  component: FieldEditor,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    projection: new ProjectionModel(createEchoSchema(TestSchema).jsonSchema, testView.projection),
    field: testView.projection.fields[0],
  },
  parameters: { controls: { disabled: true } },
};
