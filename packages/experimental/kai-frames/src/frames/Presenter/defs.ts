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
    '![DXOS](https://dev.kube.dxos.org/ipfs/gateway/QmRZKZTjHSdYz4u2Zu64r1hCExJ1kNTMDuRJWyQjvgEXsN)'
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
    '![HALO](https://dev.kube.dxos.org/ipfs/gateway/QmQ4mvUsnJ5ajv9Apespk95LW2qGQG6z9cFP1Y1uiTuPxv)'
  ].join('\n'),
  [
    '# MESH',
    '- Resilient P2P networks',
    '- WebRTC, Websockets, TCP',
    '- Signaling, ICE (STUN/TURN)',
    '- Protobuf Service RPCs',
    '- Presences',
    '![MESH](https://dev.kube.dxos.org/ipfs/gateway/QmaJcvRfUBdfkUCXyZCtibABSR16tVcUzCNBaoSKzv5Mtp)'
  ].join('\n'),
  [
    '# KUBE',
    '- Decentralized infrastructure',
    '- Publishing/hosting',
    '- Signaling, ICE, DNS',
    '- Resolvers (compute agents)',
    '- Storage (IPFS)',
    '- Extensible',
    '![KUBE](https://dev.kube.dxos.org/ipfs/gateway/QmdagBsa7wRWoNDYyL8Ks7tSNr3vSSHc1RCAFizuKG4t4G)'
  ].join('\n'),
  [
    '# DMG',
    '- Permissionless metadata graph',
    '- App registry',
    '- Service registry',
    '- Git, NPM, Docker',
    '![META](https://dev.kube.dxos.org/ipfs/gateway/QmTTp66sqj2eQzjgMpnJUcFrvhJSbv9Xvi9bsfHSU1C4in)'
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
