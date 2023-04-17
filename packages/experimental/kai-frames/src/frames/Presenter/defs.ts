//
// Copyright 2023 DXOS.org
//

import { Presentation as PresentationIcon } from '@phosphor-icons/react';
import React from 'react';

import { Space, Text } from '@dxos/client';
import { Document, DocumentStack, Presentation } from '@dxos/kai-types';

import { FrameRuntime } from '../../registry';

export const PresenterFrame = React.lazy(() => import('./PresenterFrame'));

// TODO(burdon): Import.
// prettier-ignore
const defaultSlides = [
  [
    '![DXOS](https://dev.kube.dxos.org/ipfs/gateway/)'
  ].join('\n'),
  [
    '# DXOS',
    '- `ECHO`: Decentralized data',
    '- `HALO`: Decentralized identity',
    '- `MESH`: Decentralized networks',
    '- `KUBE`: Decentralized infrastructure',
    '- `META`: Decentralized metagraph'
  ].join('\n'),
  [
    '# ECHO',
    '- Replicated graph database',
    '- Eventually consistent',
    '- Multiplexed data pipelines',
    '- End-to-end encryption',
    '- Strongly-typed objects',
    '- Realtime subscriptions',
    '- Simple API',
    '![KUBE](https://dev.kube.dxos.org/ipfs/gateway/QmRCqEGBRojS8AtQfFm3P6CMfdTWtqjM4e7JcCGfGY7eZR)'
  ].join('\n'),
  [
    '# Hello World',
    '```tsx',
    'import React from \'react\'',
    'import { useClient } from \'@dxos/react-client\'',
    '',
    'import { Task } from \'./schema\'',
    '',
    'const TaskList = ({ key }) => {',
    '  const space = useSpace(key)',
    '  const { objects: tasks } = space.db.query(Task)',
    '',
    '  const handleCreate = (title: string) => {',
    '    space.db.add(new Task({ title }))',
    '  }',
    '',
    '  return <ul>{tasks.map(task => <li key={task.id}>{task.title}</li>)}</ul>',
    '}',
    '```'
  ].join('\n'),
  [
    '# HALO',
    '- Decentralized identity',
    '- ',
    '![HALO](https://dev.kube.dxos.org/ipfs/gateway/QmUwp3B5yv2rQe5E4CRDwc2b56UPBwFoJZnquVYEgesLLE)'
  ].join('\n'),
  [
    '# MESH',
    '- Resilient P2P networks',
    '- ',
    '![MESH](https://dev.kube.dxos.org/ipfs/gateway/QmSJrJNJ8bzFhW21pbhE4vuUkWRJ8aqEwdeYteFmayruw3)'
  ].join('\n'),
  [
    '# KUBE',
    '- Decentralized infrastructure',
    '- ',
    '![KUBE](https://dev.kube.dxos.org/ipfs/gateway/)'
  ].join('\n'),
  [
    '# DMG',
    '- Decentralized Metagraph',
    '- ',
    '![DMG](https://dev.kube.dxos.org/ipfs/gateway/QmdvVq8BYvTD62EgLDApsMJTvfBvzud1DyZeFATotm5VSL)'
  ].join('\n'),
  [
    '# Join us!',
    '- https://dxos.org',
    '- hello@dxos.org',
    '- join our Discord: https://discord.gg/BgQrZutd'
  ].join('\n')
];

export const PresenterFrameRuntime: FrameRuntime<Presentation> = {
  Icon: PresentationIcon,
  Component: PresenterFrame,
  title: 'title',
  filter: () => Presentation.filter(),
  onCreate: async (space: Space) => {
    const presentation = await space.db.add(new Presentation({ stack: new DocumentStack({ title: 'DXOS Deck' }) }));
    defaultSlides.forEach((content) => {
      presentation!.stack.sections.push(
        new DocumentStack.Section({
          object: new Document({ content: new Text(content) })
        })
      );
    });

    return presentation;
  }
};
