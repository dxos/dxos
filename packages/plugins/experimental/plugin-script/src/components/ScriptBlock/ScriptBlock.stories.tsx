//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import React, { useEffect, useMemo } from 'react';

import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { TextType } from '@dxos/plugin-markdown/types';
import { useClient } from '@dxos/react-client';
import { create, createEchoObject, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

// @ts-ignore
import mainUrl from './FrameContainer/frame?url';
import { ScriptBlock } from './ScriptBlock';
import { ScriptType } from '../../types';

const code = [
  "import { Filter, useQuery, useSpaces} from '@dxos/react-client/echo';",
  "import { Chart, Explorer, Globe } from '@dxos/plugin-explorer';",
  '',
  'export default () => {',
  '  const spaces = useSpaces();',
  '  const space = spaces[1]',
  "  const objects = useQuery(space, Filter.typename('example.com/type/contact'));",
  '  return <Chart items={objects} accessor={object => ({ x: object.lat, y: object.lng })} />',
  '}',
].join('\n');

const Story = () => {
  const client = useClient();
  const spaces = useSpaces();
  console.log(spaces.length);

  useEffect(() => {
    try {
      // TODO(burdon): Default not set.
      const generator = createSpaceObjectGenerator(client.spaces.default);
      generator.addSchemas();
      void generator
        .createObjects({
          [TestSchemaType.organization]: 20,
          [TestSchemaType.contact]: 50,
        })
        .catch();
    } catch (err) {
      console.log(err);
    }
  }, [client]);

  // TODO(burdon): Review what's the right way to create automerge-backed objects.
  const object = useMemo(
    () => createEchoObject(create(ScriptType, { source: create(TextType, { content: code }) })),
    [],
  );

  // TODO(dmaretskyi): Not sure how to provide `containerUrl` here since the html now lives in composer-app.
  // TODO(burdon): Normalize html/frame.tsx with composer-app to test locally.
  return <ScriptBlock script={object} containerUrl={mainUrl} />;
};

export default {
  title: 'plugin-script/ScriptBlock',
  component: ScriptBlock,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true }), withClientProvider({ createSpace: true })],
  render: Story,
};

export const Default = {};
