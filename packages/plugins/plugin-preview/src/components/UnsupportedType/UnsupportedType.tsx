//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';

export type UnsupportedTypeProps = {
  /** The surface's own role, threaded to `Panel.Root`. */
  role?: string;
  /** Typename of the object no enabled plugin can render. */
  typename: string;
  /** Opens the plugin registry to find the plugin; omitted where the build has no registry. */
  onFindPlugin?: () => void;
};

/**
 * Stand-in for an object no enabled plugin can render; which objects reach it is
 * `capabilities/react-surface.ts`'s call.
 */
export const UnsupportedType = ({ role, typename, onFindPlugin }: UnsupportedTypeProps) => {
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
            {onFindPlugin && (
              <Layout.Flex>
                <Button.Root variant='primary' onClick={onFindPlugin} data-testid='previewPlugin.findPlugin'>
                  {t('find-plugin.label')}
                </Button.Root>
              </Layout.Flex>
            )}
          </Banner.Root>
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};
