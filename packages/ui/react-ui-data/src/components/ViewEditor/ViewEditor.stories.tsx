//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { DynamicSchemaRegistry } from '@dxos/echo-db';
import { create, type SchemaResolver } from '@dxos/echo-schema';
import { useSpace } from '@dxos/react-client/echo';
import { type ViewType } from '@dxos/schema';
import { withTheme, withLayout, withSignals } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import { testView } from '../../testing';
import translations from '../../translations';
import { TestPopup } from '../testing';

type StoryProps = Omit<ViewEditorProps, 'schemaResolver'>;

const Story = (props: StoryProps) => {
  const space = useSpace();
  const resolver = useMemo<SchemaResolver | undefined>(() => {
    if (space) {
      const registry = new DynamicSchemaRegistry(space.db);
      return (typename: string) => registry.getSchemaByTypename(typename);
    }
  }, [space]);
  if (!resolver) {
    return null;
  }

  return (
    <TestPopup>
      <ViewEditor schemaResolver={resolver} {...props} />
    </TestPopup>
  );
};

export default {
  title: 'react-ui-data/ViewEditor',
  decorators: [withTheme, withSignals, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  render: Story,
  parameters: {
    translations,
  },
};

export const Default: StoryObj<StoryProps> = {
  args: {
    view: create(testView),
  },
};

export const Empty: StoryObj<StoryProps> = {
  args: {
    view: create<ViewType>({
      query: {
        schema: 'example.com/schema/TestSchema',
      },
      fields: [],
    }),
  },
};
