//
// Copyright 2023 DXOS.org
//

import { Presentation as PresentationIcon } from '@phosphor-icons/react';
import React from 'react';

import { Space, Text } from '@dxos/client';
import { Document, DocumentStack, Presentation } from '@dxos/kai-types';

import { FrameRuntime } from '../../registry';

export const PresenterFrame = React.lazy(() => import('./PresenterFrame'));

const defaultSlides = [
  '# DXOS\n- HALO: Decentralized identity\n- ECHO: Decentralized data\n- MESH: Decentralized networks',
  '# Why Decentralization Matters\n- User experience\n- Privacy\n- Performance\n- Cost',
  '# Get Involved\nhello@dxos.org'
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
