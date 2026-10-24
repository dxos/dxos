//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useAttention } from '@dxos/react-ui-attention';

import { Deck } from '#components';
import { useDocumentDeck, useIsPresenting, useSetPresenting, useSlideIndex } from '#hooks';

export type DocumentArticleProps = AppSurface.ObjectArticleProps<Markdown.Document>;

/**
 * Preview companion of a markdown document: its `---`-separated slides on the deck runtime.
 */
export const DocumentArticle = ({ role, subject: document, attendableId }: DocumentArticleProps) => {
  const slides = useDocumentDeck(document);
  const [index, setIndex] = useSlideIndex(Obj.getURI(document), slides.length);
  const fullscreen = useIsPresenting(document);
  const setPresenting = useSetPresenting(document);
  // Only the attended article takes focus, so the editor beside the preview keeps its caret.
  const { hasAttention } = useAttention(attendableId);

  const handleFullscreenChange = useCallback(
    (next: boolean) => {
      void setPresenting(next);
    },
    [setPresenting],
  );

  return (
    <Deck
      role={role}
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={handleFullscreenChange}
      attendableId={attendableId}
      autoFocus={hasAttention}
    />
  );
};

DocumentArticle.displayName = 'DocumentArticle';
