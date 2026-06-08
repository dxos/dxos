//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { ASSISTANT_COMPANION_VARIANT } from '@dxos/plugin-assistant';
import { Button, Carousel, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { HelpOperation } from '#types';

type Slide = {
  src: string;
  description: string;
};

const welcome: Slide = {
  src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
  description: 'Welcome to DXOS',
};

export type WelcomeArticleProps = {
  role?: string;
};

/**
 * Welcome surface — hosts the joyride entry point, a plugin showcase carousel, and the support chat shortcut.
 */
export const WelcomeArticle = ({ role }: WelcomeArticleProps = {}) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const manager = usePluginManager();

  const slides: Slide[] = useMemo(
    () => [
      welcome,
      ...manager.getPlugins().flatMap((plugin) =>
        (plugin.meta.screenshots ?? []).map((src) => ({
          src,
          description: plugin.meta.description ?? plugin.meta.name ?? plugin.meta.id,
        })),
      ),
    ],
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
            <>
              <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
              <p className='max-w-prose text-center text-description'>{t('welcome.description')}</p>
              <Button variant='primary' onClick={handleOpenChat}>
                {t('open-assistant.button')}
              </Button>
            </>

            {slides.length > 0 && (
              <Carousel.Root count={slides.length}>
                <Carousel.Content classNames='max-w-[50rem]'>
                  <Carousel.Previous />
                  <Carousel.Viewport>
                    {slides.map((slide, i) => (
                      <Carousel.Slide key={slide.src} index={i} src={slide.src} alt={slide.description} />
                    ))}
                  </Carousel.Viewport>
                  <Carousel.Next />
                  <Carousel.Indicators />
                  <Carousel.Caption>{(i) => slides[i]?.description}</Carousel.Caption>
                </Carousel.Content>
              </Carousel.Root>
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
