//
// Copyright 2026 DXOS.org
//

import React, { memo, useMemo } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { Carousel, Flex, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { HelpOperation } from '#types';

const WELCOME_SLIDE = {
  src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
  description: 'Welcome to DXOS',
};

/**
 * Help companion for a space's Home: what Composer is, a showcase of the installed plugins, and the
 * guided tour.
 */
export const SupportHomeCompanion = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon='ph--path--regular'
            label={t('start-tour.button')}
            onClick={() => invokePromise(HelpOperation.Start)}
            data-testid='supportPlugin.startTour'
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-3'>
            <WelcomePanel />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

/**
 * Memoized (no props) so the pane's ongoing re-renders never re-create the cross-origin Cloudflare
 * Stream iframe the carousel hosts — that remount froze the UI.
 */
const WelcomePanel = memo(() => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();

  const slides = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ key: string; src: string; description: string }> = [{ key: 'welcome', ...WELCOME_SLIDE }];
    for (const plugin of manager.getPlugins()) {
      for (const [index, screenshot] of (plugin.meta.profile.screenshots ?? []).entries()) {
        const src = screenshot.light ?? screenshot.dark;
        if (!src || seen.has(src)) {
          continue;
        }
        seen.add(src);
        result.push({
          key: `${plugin.meta.profile.key}:${index}`,
          src,
          // Use the short plugin name — meta.description can be multi-kB and stalls caption/layout.
          description: plugin.meta.profile.name ?? plugin.meta.profile.key,
        });
      }
    }
    return result;
  }, [manager]);

  return (
    <Flex column gap='lg' align='center'>
      <h1 className='text-lg font-semibold'>{t('welcome.title')}</h1>
      <p className='text-center text-balance text-description'>{t('welcome.description')}</p>
      {slides.length > 0 && (
        <Carousel.Root count={slides.length} continuous autoAdvance={10_000}>
          <Carousel.Content classNames='w-full'>
            <Carousel.Previous />
            <Carousel.Viewport>
              {slides.map((slide, index) => (
                <Carousel.Slide key={slide.key} index={index} src={slide.src} alt={slide.description} />
              ))}
            </Carousel.Viewport>
            <Carousel.Next />
            <Carousel.Indicators />
            <Carousel.Caption>{(index) => slides[index]?.description}</Carousel.Caption>
          </Carousel.Content>
        </Carousel.Root>
      )}
    </Flex>
  );
});

WelcomePanel.displayName = 'WelcomePanel';

SupportHomeCompanion.displayName = 'SupportHomeCompanion';
