//
// Copyright 2023 DXOS.org
//

import { Presentation as PresentationIcon } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { DocumentStack, Presentation } from '@dxos/kai-types';
import { Space, Text } from '@dxos/react-client/echo';

import { slides } from './slides';
import { FrameRuntime } from '../../registry';

export const PresenterFrame = React.lazy(() => import('./PresenterFrame'));

export const PresenterFrameRuntime: FrameRuntime<Presentation> = {
  Icon: PresentationIcon,
  Component: PresenterFrame,
  title: 'title',
  filter: () => Presentation.filter(),
  onCreate: async (space: Space) => {
    const presentation = await space.db.add(new Presentation({ stack: new DocumentStack({ title: 'DXOS Deck' }) }));
    slides.echo.forEach((content) => {
      presentation!.stack.sections.push(
        new DocumentStack.Section({
          object: new Document({ content: new Text(content) }),
        }),
      );
    });

    return presentation;
  },
};
