//
// Copyright 2023 DXOS.org
//

import { Presentation as PresentationIcon } from '@phosphor-icons/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { DocumentStack, Presentation } from '@dxos/kai-types';
import { type Space, TextObject } from '@dxos/react-client/echo';

import { slides } from './slides';
import { type FrameRuntime } from '../../registry';

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
          object: new Document({ content: new TextObject(content) }),
        }),
      );
    });

    return presentation;
  },
};
