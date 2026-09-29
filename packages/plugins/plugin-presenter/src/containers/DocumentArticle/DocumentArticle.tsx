//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSurface, useLayout } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Panel } from '@dxos/react-ui';

import { PresentationShell, RevealPlayer } from '#components';

import { useExitPresenter } from '../../useExitPresenter.ts';

export type DocumentArticleProps = AppSurface.ObjectArticleProps<Markdown.Document>;

export const DocumentArticle = ({ role, subject: document }: DocumentArticleProps) => {
  const handleExit = useExitPresenter(document);
  const layout = useLayout();
  const fullscreen = layout.mode === 'solo--fullscreen';
  // Subscribes to the text itself so edits reach the running deck.
  const [content] = useObject(document.content, 'content');

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

DocumentArticle.displayName = 'DocumentArticle';
