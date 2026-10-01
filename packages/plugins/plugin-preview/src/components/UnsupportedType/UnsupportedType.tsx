//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Next, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type UnsupportedTypeProps = {
  /** The surface's own role, threaded to `Panel.Root`. */
  role?: string;
  /** Typename of the object no enabled plugin can render. */
  typename: string;
};

/**
 * Inert, status-only stand-in for an object no enabled plugin can render — offers no remedy; which
 * objects reach it is `capabilities/react-surface.ts`'s call.
 */
export const UnsupportedType = ({ role, typename }: UnsupportedTypeProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Body classNames='grid place-items-center p-8'>
        <Next.Banner.Root valence='info' icon='ph--puzzle-piece--regular'>
          <Next.Banner.Title>{t('unsupported-type.title')}</Next.Banner.Title>
          <Next.Banner.Body data-testid='previewPlugin.unsupportedType'>
            {t('unsupported-type.message', { typename })}
          </Next.Banner.Body>
        </Next.Banner.Root>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
