//
// Copyright 2026 DXOS.org
//

import React, { memo, useMemo } from 'react';

import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { Button, Carousel, Flex, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { HelpOperation } from '#types';

const WELCOME_SLIDE = {
  src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
  description: 'Welcome to DXOS',
};

export const SupportHomeCompanion = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button
            icon='ph--path--regular'
            label={t('start-tour.button')}
            onClick={() => invokePromise(HelpOperation.Start)}
            data-testid='supportPlugin.startTour'
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-3'>
            <WelcomePanel />
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

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
          <Carousel.PrevTrigger />
          <Carousel.ItemGroup>
            {slides.map((slide, index) => (
              <Carousel.Item key={slide.key} index={index} src={slide.src} alt={slide.description} />
            ))}
          </Carousel.ItemGroup>
          <Carousel.NextTrigger />
          <Carousel.IndicatorGroup />
          <Carousel.Caption>{(index) => slides[index]?.description}</Carousel.Caption>
        </Carousel.Root>
      )}
    </Flex>
  );
});

WelcomePanel.displayName = 'WelcomePanel';

SupportHomeCompanion.displayName = 'SupportHomeCompanion';
