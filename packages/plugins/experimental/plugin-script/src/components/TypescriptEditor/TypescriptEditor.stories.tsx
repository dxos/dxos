//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useMemo } from 'react';

import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { createDataExtensions } from '@dxos/react-ui-editor';

import { TypescriptEditor } from './TypescriptEditor';
import { templates } from '../../templates';

// TODO(burdon): Features:
// - language support for S
// - hierarchical editor (DND)
// - virtual document image rendering
// - mobile rendering error

// TODO(burdon): JSX.
// TODO(burdon): Effect schema.
// TODO(burdon): react-buddy for storybook?

const Story = () => {
  const object = useMemo(() => createObject({ content: templates[0].source }), []);
  const initialValue = useMemo(() => object.content, [object]);
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  const extensions = useMemo(() => [createDataExtensions({ id: object.id, text: accessor })], [object.id, accessor]);
  return <TypescriptEditor id='test' initialValue={initialValue} extensions={extensions} />;
};

export default {
  title: 'plugin-script/TypescriptEditor',
  component: TypescriptEditor,
  render: Story,
};

export const Default = {};
