//
// Copyright 2026 DXOS.org
//

import React, { memo, useMemo } from 'react';

import { HomeSection, usePluginManager } from '@dxos/app-framework/ui';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { Carousel, useTranslation } from '@dxos/react-ui';

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
 * Home content contributor: the Welcome carousel on the personal space. Kept mounted (toggled
 * `hidden` when dismissed) so the cross-origin Stream iframe is not torn down and re-created on
 * every show/hide — that remount froze the UI. Renders nothing on other spaces.
 */
export const SpaceHomeWelcome = ({ space }: SpaceScopedProps) => {
  const client = useClient();
  const isPersonal = !!space && space.id === AppSpace.getPersonalSpace(client)?.id;
  const [dismissed] = useWelcomeDismissed();
  if (!isPersonal) {
    return null;
  }

  return (
    <HomeSection.Root classNames={dismissed ? 'hidden' : undefined}>
      <WelcomePanel />
    </HomeSection.Root>
  );
};

/**
 * Welcome content (personal space): plugin showcase carousel. The guided-tour and dismiss actions
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
    <div className='flex flex-col items-center gap-4 py-8'>
      <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
      <p className='pb-4 text-center text-balance text-description'>{t('welcome.description')}</p>
      {slides.length > 0 && (
        <Carousel.Root count={slides.length} transition='slide' continuous autoAdvance={10_000}>
          <Carousel.Content>
            <Carousel.Previous />
            <div className='flex justify-center w-full'>
              <Carousel.Viewport classNames='max-w-[40rem]'>
                {slides.map((slide, index) => (
                  <Carousel.Slide key={slide.key} index={index} src={slide.src} alt={slide.description} />
                ))}
              </Carousel.Viewport>
            </div>
            <Carousel.Next />
            <Carousel.Indicators />
            <Carousel.Caption>{(index) => slides[index]?.description}</Carousel.Caption>
          </Carousel.Content>
        </Carousel.Root>
      )}
    </div>
  );
});

WelcomePanel.displayName = 'WelcomePanel';

SpaceHomeWelcome.displayName = 'SpaceHomeWelcome';
