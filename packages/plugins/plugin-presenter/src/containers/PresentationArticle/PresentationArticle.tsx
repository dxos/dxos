//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useAttention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Deck, SectionPicker } from '#components';
import { useIsPresenting, usePresentationDeck, useSetPresenting, useSlideIndex } from '#hooks';
import { meta } from '#meta';
import { Presentation } from '#types';

/** Content of a slide created from the toolbar. */
const NEW_SLIDE_CONTENT = '# New slide';

export type PresentationArticleProps = AppSurface.ObjectArticleProps<Presentation.Presentation>;

/**
 * A presentation's slides as a grid, presented fullscreen in place; the current slide is per-viewer view state.
 */
export const PresentationArticle = ({ role, subject, attendableId }: PresentationArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const slides = usePresentationDeck(subject);
  const [theme] = useObject(subject, 'theme');
  const [index, setIndex] = useSlideIndex(Obj.getURI(subject), slides.length);
  const fullscreen = useIsPresenting(subject);
  const setPresenting = useSetPresenting(subject);
  // Only the attended article takes focus, so opening one unattended (or a reload) leaves the caret where it is.
  const { hasAttention } = useAttention(attendableId);

  const handleFullscreenChange = useCallback(
    (next: boolean) => {
      void setPresenting(next);
    },
    [setPresenting],
  );

  const handleAddSlide = useCallback(() => {
    Presentation.addSlide(subject, NEW_SLIDE_CONTENT);
  }, [subject]);

  const handleMoveSlide = useCallback(
    (from: number, to: number) => {
      Presentation.move(subject, from, to);
    },
    [subject],
  );

  return (
    <Deck.Root
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={handleFullscreenChange}
      attendableId={attendableId}
      autoFocus={hasAttention}
      theme={theme}
    >
      <Panel.Root role={role} asChild>
        <Deck.Content>
          {!fullscreen && (
            <Panel.Header>
              <Toolbar.Root>
                <SectionPicker presentation={subject} />
                <Button.Root
                  data-testid='presenter.add-slide'
                  icon='ph--plus--regular'
                  iconOnly
                  variant='ghost'
                  label={t('add-slide.label')}
                  onClick={handleAddSlide}
                />
                <div className='grow' />
                <Deck.FullscreenButton />
              </Toolbar.Root>
            </Panel.Header>
          )}
          {/* Inline, the article is the grid of slides; presenting (or an empty deck) shows one slide. */}
          <Panel.Body asChild>
            {fullscreen || slides.length === 0 ? (
              <Deck.Viewport onAddSlide={handleAddSlide} />
            ) : (
              <Deck.Grid onMove={handleMoveSlide} />
            )}
          </Panel.Body>
        </Deck.Content>
      </Panel.Root>
    </Deck.Root>
  );
};

PresentationArticle.displayName = 'PresentationArticle';
