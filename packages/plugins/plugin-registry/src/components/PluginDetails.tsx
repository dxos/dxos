//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Button, Icon, Link, useTranslation } from '@dxos/react-ui';

import { REGISTRY_PLUGIN } from '../meta';

export type PluginDetailsProps = {
  plugin: Plugin;
  enabled?: boolean;
  onEnable?: () => void;
};

export const PluginDetails = ({ plugin, enabled, onEnable }: PluginDetailsProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { description, homePage, source } = plugin.meta;
  return (
    <div role='none' className='flex p-4'>
      <div role='none' className='grow'>
        <p>{description}</p>
        {homePage && (
          <Link href={homePage} target='_blank' rel='noreferrer' classNames='text-xs text-description'>
            {t('home page label')}
            <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
          </Link>
        )}
        {source && (
          <Link href={source} target='_blank' rel='noreferrer' classNames='text-xs text-description'>
            {t('source label')}
            <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
          </Link>
        )}
      </div>
      <div role='none'>
        <Button onClick={onEnable}>{enabled ? t('disable plugin label') : t('enable plugin label')}</Button>
      </div>
    </div>
  );
};
