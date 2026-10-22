//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { type Database, Obj, URI } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Panel from '@dxos/react-ui/Panel';

import { PresentationShell, RevealPlayer, type SlideEmbed } from '#components';

import { useExitPresenter } from '../../useExitPresenter.ts';

export type DocumentArticleProps = AppSurface.ObjectArticleProps<Markdown.Document>;

export const DocumentArticle = ({ role, subject: document }: DocumentArticleProps) => {
  const handleExit = useExitPresenter(document);
  const layout = Hooks.useLayout();
  const fullscreen = layout.mode === 'solo--fullscreen';
  const [content] = useObject(document.content, 'content');
  const db = Obj.getDatabase(document);
  const renderEmbed = useCallback(
    ({ uri }: SlideEmbed) => <EmbeddedSlide db={db} uri={uri} attendableId={Obj.getURI(document)} />,
    [db, document],
  );

  return (
    <Panel.Root role={role} classNames='relative'>
      <Panel.Body asChild>
        <PresentationShell fullscreen={fullscreen} onExit={handleExit}>
          {content !== undefined && (
            <RevealPlayer
              data-testid='presenter.deck'
              fullscreen={fullscreen}
              content={content}
              renderEmbed={renderEmbed}
            />
          )}
        </PresentationShell>
      </Panel.Body>
    </Panel.Root>
  );
};

DocumentArticle.displayName = 'DocumentArticle';

type EmbeddedSlideProps = { db?: Database.Database; uri: string; attendableId: string };

/** An object embedded in a slide, shown through its slide surface; resolved in the document's database. */
const EmbeddedSlide = ({ db, uri, attendableId }: EmbeddedSlideProps) => {
  const ref = useMemo(() => db?.makeRef<Obj.Unknown>(URI.make(uri)), [db, uri]);
  const subject = useResolveRef(ref);
  return subject ? <Surface.Surface type={AppSurface.Slide} data={{ subject, attendableId }} limit={1} /> : null;
};
