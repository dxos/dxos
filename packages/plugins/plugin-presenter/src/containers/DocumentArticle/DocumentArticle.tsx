//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AppSurface, useLayout } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Next } from '@dxos/react-ui';

import { PresentationShell, RevealPlayer } from '#components';

import { useExitPresenter } from '../../useExitPresenter.ts';

export type DocumentArticleProps = AppSurface.ObjectArticleProps<Markdown.Document>;

export const DocumentArticle = ({ role, subject: document }: DocumentArticleProps) => {
  const handleExit = useExitPresenter(document);
  const layout = useLayout();
  const fullscreen = layout.mode === 'solo--fullscreen';
  const [content] = useObject(document.content, 'content');

  return (
    <Next.Panel.Root role={role} classNames='relative'>
      <Next.Panel.Body asChild>
        <PresentationShell fullscreen={fullscreen} onExit={handleExit}>
          {content !== undefined && (
            <RevealPlayer data-testid='presenter.deck' fullscreen={fullscreen} content={content} />
          )}
        </PresentationShell>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

DocumentArticle.displayName = 'DocumentArticle';
