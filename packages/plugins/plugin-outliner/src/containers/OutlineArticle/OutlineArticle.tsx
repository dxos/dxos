//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { Outline as OutlineComponent } from '#components';

import type * as Outline from '../../types/Outline';

export type OutlineArticleProps = AppSurface.ObjectArticleProps<Outline.Outline>;

export const OutlineArticle = ({ role, attendableId: _attendableId, subject: outline }: OutlineArticleProps) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <OutlineComponent.Root id={outline.content.target.id} text={outline.content.target}>
      <Panel.Root role={role} className='dx-document'>
        <Panel.Content asChild>
          <OutlineComponent.Content />
        </Panel.Content>
      </Panel.Root>
    </OutlineComponent.Root>
  );
};

OutlineArticle.displayName = 'OutlineArticle';
