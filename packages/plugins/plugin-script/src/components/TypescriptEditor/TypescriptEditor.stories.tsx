//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/react-ui/testing';

import { templates } from '../../templates';

import { TypescriptEditor } from './TypescriptEditor';

const DefaultStory = () => {
  const object = useMemo(() => createObject({ content: templates[0].source }), []);
  const initialValue = useMemo(() => object.content, [object]);
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  const extensions = useMemo(() => [createDataExtensions({ id: object.id, text: accessor })], [object.id, accessor]);
  return <TypescriptEditor id='test' initialValue={initialValue} extensions={extensions} />;
};

const meta = {
  title: 'plugins/plugin-script/TypescriptEditor',

  decorators: [withTheme],
  component: TypescriptEditor as any,
  render: DefaultStory,
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
