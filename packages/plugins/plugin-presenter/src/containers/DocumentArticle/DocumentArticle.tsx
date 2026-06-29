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
  // RevealPlayer seeds its deck once from `content` (via a `defaultValue`); wait for the markdown ref to
  // resolve so the presentation isn't initialized empty and left blank when the content arrives later.
  const content = document.content.target?.content;

  return (
    <Panel.Root role={role} classNames='relative'>
      <Panel.Content asChild>
        <PresentationShell fullscreen={fullscreen} onExit={handleExit}>
          {content !== undefined && <RevealPlayer fullscreen={fullscreen} content={content} />}
        </PresentationShell>
      </Panel.Content>
    </Panel.Root>
  );
};
