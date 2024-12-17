//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useMemo } from 'react';

import { TextType } from '@dxos/plugin-markdown/types';
import { create, createObject, makeRef } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { ScriptBlock } from './ScriptBlock';
import { ScriptType } from '../../types';
// @ts-ignore
import mainUrl from '../FrameContainer/frame?url';

const typename = 'example.com/type/contact';

const code = [
  "import { Filter, useQuery, useSpaces} from '@dxos/react-client/echo';",
  "import { Chart, Explorer, Globe } from '@dxos/plugin-explorer';",
  '',
  'export default () => {',
  '  const spaces = useSpaces();',
  '  const space = spaces[1]',
  `  const objects = useQuery(space, Filter.typename('${typename}'));`,
  '  return <Chart items={objects} accessor={object => ({ x: object.lat, y: object.lng })} />',
  '}',
].join('\n');

const DefaultStory = () => {
  // TODO(burdon): Review what's the right way to create automerge-backed objects.
  const object = useMemo(
    () => createObject(create(ScriptType, { source: makeRef(create(TextType, { content: code })) })),
    [],
  );

  // TODO(dmaretskyi): Not sure how to provide `containerUrl` here since the html now lives in composer-app.
  // TODO(burdon): Normalize html/frame.tsx with composer-app to test locally.
  return <ScriptBlock script={object} containerUrl={mainUrl} />;
};

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-script/ScriptBlock',
  component: ScriptBlock,
  render: DefaultStory,
  decorators: [withClientProvider({ createSpace: true }), withTheme, withLayout({ fullscreen: true, tooltips: true })],
};

export default meta;
