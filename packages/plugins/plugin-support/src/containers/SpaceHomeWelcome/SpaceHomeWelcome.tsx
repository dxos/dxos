//
// Copyright 2026 DXOS.org
//

import React, { memo, useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import { useDefaultSpace } from '@dxos/app-toolkit/ui';
import { type Space } from '@dxos/react-client/echo';
import { Carousel, Flex, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { useWelcomeDismissed } from './use-welcome-dismissed';

const WELCOME_SLIDE = {
  src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
  description: 'Welcome to DXOS',
};

type SpaceScopedProps = {
  space?: Space;
};

/**
 * Home content contributor: the Welcome carousel on the default space. Kept mounted (toggled
 * `hidden` when dismissed) so the cross-origin Stream iframe is not torn down and re-created on
 * every show/hide — that remount froze the UI. Renders nothing on other spaces.
 */
export const SpaceHomeWelcome = ({ space }: SpaceScopedProps) => {
  const defaultSpace = useDefaultSpace();
  const isDefault = !!space && space.id === defaultSpace?.id;
  const [dismissed] = useWelcomeDismissed();
  if (!isDefault) {
    return null;
  }

  return (
    <HomeSection.Root classNames={dismissed ? 'hidden' : undefined}>
      <WelcomePanel />
    </HomeSection.Root>
  );
};

/**
 * Welcome content (default space): plugin showcase carousel. The guided-tour and dismiss actions
 * live in the article toolbar (contributed as graph actions; see plugin-support app-graph-builder).
 *
 * Memoized (no props) so the home article's ongoing reactive re-renders (recent-objects query,
 * assistant chat) never re-render the carousel or its cross-origin Cloudflare Stream iframe.
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
    <Flex column gap='lg' align='center' classNames='py-8'>
      <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
      <p className='pb-4 text-center text-balance text-description'>{t('welcome.description')}</p>
      {slides.length > 0 && (
        <Carousel.Root count={slides.length} transition='slide' continuous autoAdvance={10_000}>
          <Carousel.Content>
            <Carousel.Previous />
            <Flex justify='center' classNames='w-full'>
              <Carousel.Viewport classNames='max-w-[40rem]'>
                {slides.map((slide, index) => (
                  <Carousel.Slide key={slide.key} index={index} src={slide.src} alt={slide.description} />
                ))}
              </Carousel.Viewport>
            </Flex>
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

SpaceHomeWelcome.displayName = 'SpaceHomeWelcome';
