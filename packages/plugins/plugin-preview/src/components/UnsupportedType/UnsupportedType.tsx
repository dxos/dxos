//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Banner, Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type UnsupportedTypeProps = {
  /** The surface's own role, threaded to `Panel.Root`. */
  role?: string;
  /** Typename of the object no enabled plugin can render. */
  typename: string;
};

/**
 * Inert stand-in for an object no enabled plugin can render, so a plank states what it holds instead
 * of rendering empty. Deliberately offers no remedy — it reports status only. Which objects reach it
 * is the surface's call — see `capabilities/react-surface.ts`.
 */
export const UnsupportedType = ({ role, typename }: UnsupportedTypeProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Panel.Root role={role}>
      <Panel.Content classNames='grid place-items-center p-8'>
        <Banner.Root valence='info' icon='ph--puzzle-piece--regular'>
          <Banner.Content classNames='max-w-[32rem]'>
            <Banner.Title>{t('unsupported-type.title')}</Banner.Title>
            <Banner.Body data-testid='previewPlugin.unsupportedType'>
              {t('unsupported-type.message', { typename })}
            </Banner.Body>
          </Banner.Content>
        </Banner.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
