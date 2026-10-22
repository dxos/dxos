//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as AppHooks from '@dxos/app-toolkit/Hooks';
import { Obj } from '@dxos/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { Deck, SectionPicker } from '#components';
import { usePresentationDeck } from '#deck';
import { useSlideIndex } from '#hooks';
import { meta } from '#meta';
import { Presentation } from '#types';

import { useSetPresenting } from '../../useExitPresenter.ts';

/** Content of a slide created from the toolbar. */
const NEW_SLIDE_CONTENT = '# New slide';

export type PresentationArticleProps = AppSurface.ObjectArticleProps<Presentation.Presentation>;

/**
 * A presentation's deck, toggled in and out of fullscreen in place; the current slide is per-viewer view state.
 */
export const PresentationArticle = ({ role, subject, attendableId }: PresentationArticleProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const slides = usePresentationDeck(subject);
  const [index, setIndex] = useSlideIndex(Obj.getURI(subject), slides.length);
  const fullscreen = AppHooks.useLayout().mode === 'solo--fullscreen';
  const setPresenting = useSetPresenting(subject);

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
      autoFocus
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
