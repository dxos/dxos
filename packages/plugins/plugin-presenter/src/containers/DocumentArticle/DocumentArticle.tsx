//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { useLayout } from '@dxos/app-toolkit/Hooks';
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
  const [content] = useObject(document.content, 'content');

  return (
    <Panel.Root role={role} classNames='relative'>
      <Panel.Content asChild>
        <PresentationShell fullscreen={fullscreen} onExit={handleExit}>
          {content !== undefined && (
            <RevealPlayer data-testid='presenter.deck' fullscreen={fullscreen} content={content} />
          )}
        </PresentationShell>
      </Panel.Content>
    </Panel.Root>
  );
};

DocumentArticle.displayName = 'DocumentArticle';
