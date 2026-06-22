//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { memo, useCallback, useMemo } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { AppSpace } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { type Space, useObject } from '@dxos/react-client/echo';
import { Carousel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { WelcomeDismissedAnnotation } from '../../annotations';

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
 * every show/hide — that remount froze the UI. Renders nothing on non-personal spaces.
 */
export const SpaceHomeWelcome = ({ space }: SpaceScopedProps) => {
  const isPersonal = !!space && AppSpace.isPersonalSpace(space);
  const [dismissed] = useWelcomeDismissed(space);

  if (!isPersonal) {
    return null;
  }

  return (
    <div className={dismissed ? 'hidden' : undefined}>
      <WelcomePanel />
    </div>
  );
};

/**
 * Reactively read the per-space "welcome dismissed" annotation (synced via space properties) and a
 * setter that persists it. `useObject` subscribes to the properties object, so the Hide button, the
 * Settings "Show welcome page" action, and other devices all re-render live.
 */
export const useWelcomeDismissed = (space?: Space): [boolean, (value: boolean) => void] => {
  const spaceProperties = useMemo(() => space?.properties, [space]);
  const [properties, updateProperties] = useObject(spaceProperties);
  const dismissed = properties
    ? Annotation.get(properties, WelcomeDismissedAnnotation).pipe(Option.getOrElse(() => false))
    : false;
  const setDismissed = useCallback(
    (value: boolean) => updateProperties((current) => Annotation.set(current, WelcomeDismissedAnnotation, value)),
    [updateProperties],
  );

  return [dismissed, setDismissed];
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
    <div className='flex flex-col items-center gap-4 pbe-2'>
      <h1 className='text-2xl font-semibold'>{t('welcome.title')}</h1>
      <p className='max-w-prose text-center text-description'>{t('welcome.description')}</p>
      {slides.length > 0 && (
        <Carousel.Root count={slides.length}>
          <Carousel.Content classNames='max-w-[50rem]'>
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
    </div>
  );
});

WelcomePanel.displayName = 'WelcomePanel';
