//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useEffect } from 'react';

import { createEchoSchema } from '@dxos/live-object/testing';
import { log } from '@dxos/log';
import { ViewProjection } from '@dxos/schema';
import { TestSchema, testView } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { FieldEditor, type FieldEditorProps } from './FieldEditor';
import translations from '../../translations';
import { TestLayout, TestPanel, FIELD_EDITOR_DEBUG_SYMBOL } from '../testing';

// Type definition for debug objects exposed to tests.
export type FieldEditorDebugObjects = {
  props: FieldEditorProps;
  projection: ViewProjection;
};

type StoryProps = FieldEditorProps;

const DefaultStory = (props: FieldEditorProps) => {
  const projection = useMemo(() => new ViewProjection(createEchoSchema(TestSchema).jsonSchema, testView), []);
  const handleComplete: FieldEditorProps['onSave'] = () => {
    log.info('onClose', { props });
  };

  // Expose objects on window for test access.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any)[FIELD_EDITOR_DEBUG_SYMBOL] = { props, projection } satisfies FieldEditorDebugObjects;
    }
  }, [props, projection]);

  // NOTE(ZaymonFC): This looks awkward but it resolves an infinite parsing issue with sb.
  const json = useMemo(
    () => JSON.parse(JSON.stringify({ props, projection })),
    [JSON.stringify(props), JSON.stringify(projection)],
  );

  return (
    <TestLayout json={json}>
      <TestPanel>
        <FieldEditor {...props} projection={projection} onSave={handleComplete} />
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
    view: testView,
    field: testView.fields[0],
  },
  parameters: { controls: { disabled: true } },
};
