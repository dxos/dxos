//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Icon, Input, Link, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer } from '@dxos/react-ui-form';

import { REGISTRY_PLUGIN } from '../meta';

export type PluginDetailProps = {
  plugin: Plugin;
  enabled?: boolean;
  onEnable?: () => void;
};

export const PluginDetail = ({ plugin, enabled, onEnable }: PluginDetailProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { id, name, description, homePage, source, screenshots } = plugin.meta;

  return (
    <DeprecatedFormContainer classNames='gap-6'>
      <div role='none' className='flex justify-between items-center'>
        <p>{id}</p>
        <Input.Root>
          <Input.Switch classNames='self-center' checked={enabled} onClick={onEnable} />
        </Input.Root>
      </div>

      {screenshots && (
        <div role='none'>
          <h1 className='text-lg mb-2'>Preview</h1>
          <img src={screenshots[0]} alt={name} className='aspect-video object-fit' />
        </div>
      )}

      <div role='none'>
        <p>{description}</p>
      </div>

      <div role='none'>
        <h1 className='text-lg mb-2'>Resources</h1>
        <div className='flex gap-2'>
          {homePage && (
            <Link href={homePage} target='_blank' rel='noreferrer' classNames='text-sm text-description'>
              {t('home page label')}
              <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
            </Link>
          )}

          {source && (
            <Link href={source} target='_blank' rel='noreferrer' classNames='text-sm text-description'>
              {t('source label')}
              <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
            </Link>
          )}
        </div>
      </div>
    </DeprecatedFormContainer>
  );
};
