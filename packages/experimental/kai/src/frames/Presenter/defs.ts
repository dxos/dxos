//
// Copyright 2023 DXOS.org
//

import { Presentation as PresentationIcon } from '@phosphor-icons/react';
import React from 'react';

import { Space, Text } from '@dxos/client';
import { FrameRuntime } from '@dxos/kai-frames';
import { Document, DocumentStack, Presentation } from '@dxos/kai-types';

export const PresenterFrame = React.lazy(() => import('./PresenterFrame'));

// TODO(burdon): Import.
// prettier-ignore
const defaultSlides = [
  [
    '# DXOS',
    '- HALO: Decentralized identity',
    '- ECHO: Decentralized data',
    '- MESH: Decentralized networks'
  ].join('\n'),
  [
    '# Why Decentralization Matters',
    '- User experience',
    '- Privacy',
    '- Performance',
    '- Cost'
  ].join('\n'),
  [
    '# Code sample',
    'Getting started:',
    '```tsx',
    'import React from \'react\';',
    'import { useClient } from \'@dxos/react-client\';',
    '',
    'const Hello = () => {',
    '  const client = useClient();',
    '  return <div>DXOS</div>',
    '};',
    '```'
  ].join('\n'),
  [
    '# Get Involved',
    'hello@dxos.org'
  ].join('\n')
];

export const PresenterFrameRuntime: FrameRuntime<Presentation> = {
  Icon: PresentationIcon,
  Component: PresenterFrame,
  title: 'title',
  filter: () => Presentation.filter(),
  onCreate: async (space: Space) => {
    const presentation = await space.db.add(new Presentation({ stack: new DocumentStack({ title: 'New Deck' }) }));
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
