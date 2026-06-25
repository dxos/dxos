//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSurface, useLayout } from '@dxos/app-toolkit/ui';
import { type Markdown } from '@dxos/plugin-markdown';
import { Panel } from '@dxos/react-ui';

import { PresentationShell, RevealPlayer } from '#components';

import { useExitPresenter } from '../../useExitPresenter';

export type DocumentArticleProps = AppSurface.ObjectArticleProps<Markdown.Document>;

export const DocumentArticle = ({ role, subject: document }: DocumentArticleProps) => {
  const handleExit = useExitPresenter(document);
  const layout = useLayout();
  const fullscreen = layout.mode === 'solo--fullscreen';

  return (
    <Panel.Root role={role} classNames='relative'>
      <Panel.Content asChild>
        <PresentationShell onExit={handleExit}>
          <RevealPlayer content={document.content.target?.content ?? ''} fullscreen={fullscreen} />
        </PresentationShell>
      </Panel.Content>
    </Panel.Root>
  );
};
