//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { ASSISTANT_COMPANION_VARIANT } from '@dxos/plugin-assistant';
import { Button, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment } from '@dxos/react-ui-attention';

import { Carousel } from '#components';
import { meta } from '#meta';
import { HelpOperation } from '#types';

export type WelcomeArticleProps = {
  role?: string;
};

type Slide = { src: string; description: string };

/** Welcome surface — hosts the joyride entry point, a plugin showcase carousel, and the support chat shortcut. */
export const WelcomeArticle = ({ role }: WelcomeArticleProps = {}) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const manager = usePluginManager();

  const slides: Slide[] = useMemo(
    () =>
      manager
        .getPlugins()
        .flatMap((plugin) =>
          (plugin.meta.screenshots ?? []).map((src) => ({ src, description: plugin.meta.name ?? plugin.meta.id })),
        ),
    [manager],
  );

  const handleStartTour = useCallback(() => {
    void invokePromise(HelpOperation.Start);
  }, [invokePromise]);

  const handleOpenChat = useCallback(() => {
    void invokePromise(LayoutOperation.UpdateCompanion, {
      subject: linkedSegment(ASSISTANT_COMPANION_VARIANT),
    });
  }, [invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Button onClick={handleStartTour}>{t('start-tour.button')}</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-8 flex flex-col items-center gap-6'>
            <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
            <p className='max-w-prose text-center text-description'>{t('welcome.description')}</p>
            <Button variant='primary' onClick={handleOpenChat}>
              {t('open-chat.button')}
            </Button>
            {slides.length > 0 && (
              <Carousel.Root count={slides.length}>
                <Carousel.Frame>
                  <Carousel.Previous />
                  <Carousel.Viewport>
                    {slides.map((slide, i) => (
                      <Carousel.Slide key={slide.src} index={i}>
                        <img
                          src={slide.src}
                          alt={slide.description}
                          className='absolute inset-0 w-full h-full object-cover'
                          loading='lazy'
                        />
                      </Carousel.Slide>
                    ))}
                  </Carousel.Viewport>
                  <Carousel.Next />
                </Carousel.Frame>
                <Carousel.Indicators />
                <Carousel.Caption>{(i) => slides[i]?.description}</Carousel.Caption>
              </Carousel.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
