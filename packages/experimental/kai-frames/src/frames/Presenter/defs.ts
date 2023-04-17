//
// Copyright 2023 DXOS.org
//

import { Presentation as PresentationIcon } from '@phosphor-icons/react';
import React from 'react';

import { Space, Text } from '@dxos/client';
import { Document, DocumentStack, Presentation } from '@dxos/kai-types';

import { FrameRuntime } from '../../registry';

export const PresenterFrame = React.lazy(() => import('./PresenterFrame'));

// TODO(burdon): Create script to upload IPFS images and update template.

// TODO(burdon): Convert to JSON file.
// prettier-ignore
const defaultSlides = [
  [
    '![DXOS](https://dev.kube.dxos.org/ipfs/gateway/QmRBSbjK3Y4rHE1WEbxd6bhe1PhJoueiGmaZhz2B9YAA6B)'
  ].join('\n'),
  [
    '# DXOS',
    'An alternative to the cloud for realtime collaborative applications.',
    '### Technology',
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
    '- Humans, agents, servers',
    '- Verifiable credentials',
    '- Resource access control',
    '- Universal keychain',
    '![HALO](https://dev.kube.dxos.org/ipfs/gateway/QmUwp3B5yv2rQe5E4CRDwc2b56UPBwFoJZnquVYEgesLLE)'
  ].join('\n'),
  [
    '# MESH',
    '- Resilient P2P networks',
    '- Signaling, ICE (STUN/TURN)',
    '- Protobuf Services RPCs',
    '- MST',
    '![MESH](https://dev.kube.dxos.org/ipfs/gateway/QmSJrJNJ8bzFhW21pbhE4vuUkWRJ8aqEwdeYteFmayruw3)'
  ].join('\n'),
  [
    '# KUBE',
    '- Decentralized infrastructure',
    '- Publishing/hosting',
    '- Signaling, ICE, DNS',
    '- Resolvers (compute agents)',
    '- Storage (IPFS)',
    '- Extensible',
    '![KUBE](https://dev.kube.dxos.org/ipfs/gateway/QmQ28xXSuPjXEZtY4pPTuoWQw78G3YKzoDo6NE5wJgYmQU)'
  ].join('\n'),
  [
    '# DMG',
    '- Permissionless metadata graph',
    '- App registry',
    '- Service registry',
    '- Git, NPM, Docker',
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
