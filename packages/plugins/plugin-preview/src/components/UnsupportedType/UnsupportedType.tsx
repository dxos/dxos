//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

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
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <Layout.Grid center classNames='p-8'>
          <Banner.Root valence='info' icon='ph--puzzle-piece--regular'>
            <Banner.Title>{t('unsupported-type.title')}</Banner.Title>
            <Banner.Body data-testid='previewPlugin.unsupportedType'>
              {t('unsupported-type.message', { typename })}
            </Banner.Body>
          </Banner.Root>
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};
