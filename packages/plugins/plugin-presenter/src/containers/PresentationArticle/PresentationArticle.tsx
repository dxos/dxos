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

import { Deck, SectionPicker } from '#components';
import { useIsPresenting, usePresentationDeck, useSetPresenting, useSlideIndex } from '#hooks';
import { meta } from '#meta';
import { Presentation } from '#types';

/** Content of a slide created from the toolbar. */
const NEW_SLIDE_CONTENT = '# New slide';

export type PresentationArticleProps = AppSurface.ObjectArticleProps<Presentation.Presentation>;

/**
 * A presentation's deck, toggled in and out of fullscreen in place; the current slide is per-viewer view state.
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

  return (
    <Deck
      role={role}
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      fullscreen={fullscreen}
      onFullscreenChange={handleFullscreenChange}
      onAddSlide={handleAddSlide}
      attendableId={attendableId}
      autoFocus={hasAttention}
      theme={theme}
      toolbar={
        <>
          <SectionPicker presentation={subject} />
          <Button.Root
            data-testid='presenter.add-slide'
            icon='ph--plus--regular'
            iconOnly
            variant='ghost'
            label={t('add-slide.label')}
            onClick={handleAddSlide}
          />
        </>
      }
    />
  );
};

PresentationArticle.displayName = 'PresentationArticle';
