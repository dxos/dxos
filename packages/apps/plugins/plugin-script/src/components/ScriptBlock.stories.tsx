//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useMemo } from 'react';

import { createSpaceObjectGenerator, TestSchemaType } from '@dxos/echo-generator';
import { createDocAccessor, createEchoReactiveObject } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { ClientRepeater } from '@dxos/react-client/testing';

// @ts-ignore
import mainUrl from './FrameContainer/frame?url';
import { ScriptBlock } from './ScriptBlock';

const code = [
  "import { Filter, useQuery, useSpaces} from '@dxos/react-client/echo';",
  "import { Chart, Explorer, Globe } from '@braneframe/plugin-explorer';",
  '',
  'export default () => {',
  '  const spaces = useSpaces();',
  '  const space = spaces[1]',
  "  const objects = useQuery(space, Filter.typename('example.com/schema/contact'));",
  '  return <Chart items={objects} accessor={object => ({ x: object.lat, y: object.lng })} />',
  '}',
].join('\n');

const Story = () => {
  const client = useClient();
  // TODO(dmaretskyi): Review what's the right way to create automerge-backed objects.
  const object = useMemo(() => createEchoReactiveObject({ content: code }), [code]);
  const accessor = useMemo(() => createDocAccessor(object, ['content']), [object]);
  useEffect(() => {
    const generator = createSpaceObjectGenerator(client.spaces.default);
    generator.addSchemas();
    generator.createObjects({ [TestSchemaType.organization]: 20, [TestSchemaType.contact]: 50 });
  }, []);

  // TODO(dmaretskyi): Not sure how to provide `containerUrl` here since the html now lives in composer-app.
  // TODO(burdon): Normalize html/frame.tsx with composer-app to test locally.
  return (
    <div className={'flex fixed inset-0'}>
      {accessor && <ScriptBlock id='test' source={accessor} containerUrl={mainUrl} />}
    </div>
  );
};

export default {
  title: 'plugin-script/ScriptBlock',
  component: ScriptBlock,
  render: () => <ClientRepeater component={Story} createSpace />,
  decorators: [],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
