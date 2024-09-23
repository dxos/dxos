//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React, { useMemo } from 'react';

import { createDocAccessor, createEchoObject } from '@dxos/react-client/echo';
import { createDataExtensions } from '@dxos/react-ui-editor';

import { TypescriptEditor } from './TypescriptEditor';

// TODO(burdon): Typescript.
// TODO(burdon): Effect schema.
// TODO(burdon): JSX.
// TODO(burdon): react-buddy for storybook?

// Marijn
// - language support for S
// - hierarchical editor (DND)
// - virtual document image rendering
// - mobile rendering error

const examples: string[] = [
  [
    '// Example function.',
    'export default function() {',
    '  const value = 100',
    '  return <div>{value}</div>;',
    '}',
  ].join('\n'),
  [
    '// Example schema.',
    'S.Struct({',
    '  timestamp: S.Date,',
    '  title: S.String,',
    '  content: R.Text,',
    "}).pipe(S.identifier('dxos.org/schema/Test'))",
    '',
  ].join('\n'),
];

const Story = () => {
  const object = useMemo(() => createEchoObject({ content: examples[0] }), []);
  const initialValue = useMemo(() => object.content, [object]);
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  const extensions = useMemo(() => [createDataExtensions({ id: object.id, text: accessor })], [object.id, accessor]);

  // TODO(wittjosiah): Scroll past end breaks the editor.
  return <TypescriptEditor id='test' initialValue={initialValue} extensions={extensions} scrollPastEnd={false} />;
};

export default {
  title: 'plugin-script/TypescriptEditor',
  component: TypescriptEditor,
  render: Story,
};

export const Default = {};
