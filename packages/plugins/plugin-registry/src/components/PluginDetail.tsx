//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Plugin } from '@dxos/app-framework';
import { Icon, Input, Link, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { getStyles, mx } from '@dxos/ui-theme';

import { meta } from '../meta';

export type PluginDetailProps = {
  plugin: Plugin.Plugin;
  enabled?: boolean;
  onEnable?: () => void;
};

export const PluginDetail = ({ plugin, enabled, onEnable }: PluginDetailProps) => {
  const { t } = useTranslation(meta.id);
  const {
    id,
    name,
    description,
    homePage,
    source,
    screenshots,
    icon = 'ph--circle--regular',
    iconHue = 'neutral',
  } = plugin.meta;
  const styles = getStyles(iconHue);

  return (
    <StackItem.Content scrollable>
      <div role='none' className='grid grid-cols-[min-content_1fr] gap-4 container-max-width p-4'>
        <div role='none'>
          <Icon classNames={mx('p-1 rounded', styles.bg, styles.icon)} icon={icon} size={14} />
        </div>
        <div role='none' className='flex flex-col gap-6'>
          <div role='none' className='grid grid-cols-[1fr_min-content] gap-x-3 is-full pbs-1'>
            <h2 className='text-xl'>{name}</h2>
            <Input.Root>
              <Input.Switch classNames='self-center' checked={enabled} onClick={onEnable} />
            </Input.Root>
            <p className='pbs-0.5 text-sm text-description'>{id}</p>
          </div>

          <div role='none'>
            <p className='text-description'>{description}</p>
          </div>

          {screenshots && screenshots.length > 0 && (
            <div role='none' className='flex flex-col gap-2'>
              <h2>Preview</h2>
              <img src={screenshots[0]} alt={name} className='aspect-video object-fit' />
            </div>
          )}

          <div role='none' className='flex flex-col gap-2'>
            <h2>Resources</h2>
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
        </div>
      </div>
    </StackItem.Content>
  );
};
