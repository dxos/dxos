//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useAttention } from '@dxos/react-ui-attention';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Deck } from '#components';
import { useDocumentDeck, useIsPresenting, usePresentedIndex, useSetPresenting, useSlideIndex } from '#hooks';
import { isHiddenSlide } from '#markdown';

export type DocumentArticleProps = AppSurface.ObjectArticleProps<Markdown.Document>;

/**
 * Preview companion of a markdown document: its `---`-separated slides on the deck runtime.
 */
export const DocumentArticle = ({ role, subject: document, attendableId }: DocumentArticleProps) => {
  const slides = useDocumentDeck(document);
  const [index, setIndex] = useSlideIndex(Obj.getURI(document), slides.length);
  const fullscreen = useIsPresenting(document);
  // Presenting leaves out slides whose frontmatter sets `hide: true`; the preview still shows every slide.
  const positions = useMemo(
    () =>
      slides.flatMap((slide, position) =>
        slide.kind === 'markdown' && isHiddenSlide(slide.content) ? [] : [position],
      ),
    [slides],
  );
  const presented = usePresentedIndex(slides, positions, index, setIndex);
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
    <Deck.Root
      slides={fullscreen ? presented.slides : slides}
      index={fullscreen ? presented.index : index}
      onIndexChange={fullscreen ? presented.onIndexChange : setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={handleFullscreenChange}
      attendableId={attendableId}
      autoFocus={hasAttention}
    >
      <Panel.Root role={role} asChild>
        <Deck.Content>
          {/* Fullscreen is the slide alone; the toolbar and pager return on exit. */}
          {!fullscreen && (
            <Panel.Header>
              <Toolbar.Root>
                <div className='grow' />
                <Deck.PlayButton />
              </Toolbar.Root>
            </Panel.Header>
          )}
          <Panel.Body asChild>
            <Deck.Viewport />
          </Panel.Body>
          {!fullscreen && (
            <Panel.Footer>
              <div className='flex items-center justify-center gap-4'>
                <Deck.Pager />
                <Deck.PageNumber />
              </div>
            </Panel.Footer>
          )}
        </Deck.Content>
      </Panel.Root>
    </Deck.Root>
  );
};

DocumentArticle.displayName = 'DocumentArticle';
