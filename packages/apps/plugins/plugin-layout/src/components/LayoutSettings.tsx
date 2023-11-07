//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { parseIntentPlugin, usePlugin, useResolvePlugin } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';

import { type LayoutState } from '../LayoutContext';
import { LAYOUT_PLUGIN } from '../meta';

export const LayoutSettings = () => {
  const { t } = useTranslation(LAYOUT_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);
  const layoutPlugin = usePlugin<{ layout: LayoutState }>(LAYOUT_PLUGIN);
  if (!layoutPlugin || !intentPlugin) {
    return null;
  }

  return (
    <>
      <div role='none' className='flex items-center gap-2'>
        <Input.Root>
          <Input.Checkbox
            checked={layoutPlugin.provides.layout.enableComplementarySidebar}
            onCheckedChange={(checked) =>
              intentPlugin.provides.intent.dispatch({
                plugin: LAYOUT_PLUGIN,
                action: 'dxos.org/plugin/layout/enable-complementary-sidebar',
                data: { state: !!checked },
              })
            }
          />
          <Input.Label>{t('enable complementary sidebar label')}</Input.Label>
        </Input.Root>
      </div>
    </>
  );
};
