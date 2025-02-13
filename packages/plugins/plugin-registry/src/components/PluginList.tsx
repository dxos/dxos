//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { eventKey, Events, getEvents, type Plugin } from '@dxos/app-framework';
import { Button, Icon, Input, Link, List, ListItem, useTranslation } from '@dxos/react-ui';
import { descriptionText, fineBlockSize, mx } from '@dxos/react-ui-theme';

import { REGISTRY_PLUGIN } from '../meta';

export type PluginListProps = {
  plugins?: readonly Plugin[];
  installed?: readonly string[];
  enabled?: readonly string[];
  onChange?: (id: string, enabled: boolean) => void;
  onReload?: () => void;
};

export const PluginList = ({ plugins = [], ...props }: PluginListProps) => {
  return (
    <List classNames='mb-4 select-none'>
      {plugins.map((plugin) => (
        <PluginItem key={plugin.meta.id} plugin={plugin} {...props} />
      ))}
    </List>
  );
};

const checkReloadRequired = (plugin: Plugin) => {
  return plugin.modules.some((module) =>
    getEvents(module.activatesOn)
      .map((event) => event.id)
      .includes(eventKey(Events.Startup)),
  );
};

type PluginItemProps = Omit<PluginListProps, 'plugins'> & {
  plugin: Plugin;
};

const PluginItem = ({ plugin, installed = [], enabled = [], onChange, onReload }: PluginItemProps) => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { id, name, description, homePage, source, icon = 'ph--circle--regular' } = plugin.meta;
  const isEnabled = enabled.includes(id);
  const isInstalled = installed.includes(id);
  const reloadRequired = checkReloadRequired(plugin);
  const shouldReload = !isInstalled && isEnabled && reloadRequired && Boolean(onReload);
  const inputId = `${id}-input`;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const handleChange = useCallback(() => onChange?.(id, !isEnabled), [id, isEnabled, onChange]);

  return (
    <Input.Root key={id} id={inputId}>
      <ListItem.Root
        labelId={labelId}
        data-testid={`pluginList.${id}`}
        aria-describedby={descriptionId}
        classNames='flex gap-2 plb-2 pli-2 -mli-2 rounded'
      >
        <Icon icon={icon} size={6} classNames='shrink-0 mbs-1' />
        <div role='none' className={mx(fineBlockSize, 'grow pbs-1 pl-1')}>
          <label htmlFor={inputId} id={labelId} className='truncate'>
            {name ?? id}
          </label>
          {(description || shouldReload || homePage || source) && (
            <>
              <div id={descriptionId} className='space-b-1 pbs-1 pbe-1'>
                <p className={descriptionText}>{description}</p>
                {homePage && (
                  <Link
                    href={homePage}
                    target='_blank'
                    rel='noreferrer'
                    aria-describedby={descriptionId}
                    classNames='text-xs text-description'
                  >
                    {t('home page label')}
                    <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
                  </Link>
                )}
                {source && (
                  <Link
                    href={source}
                    target='_blank'
                    rel='noreferrer'
                    aria-describedby={descriptionId}
                    classNames='text-xs text-description'
                  >
                    {t('source label')}
                    <Icon icon='ph--arrow-square-out--bold' size={3} classNames='inline-block leading-none mli-1' />
                  </Link>
                )}
              </div>
              {shouldReload && (
                <Button variant='ghost' classNames='p-0 gap-2' onClick={onReload}>
                  <Icon size={4} icon='ph--arrow-clockwise--regular' />
                  <p className='text-sm font-medium'>{t('reload required message')}</p>
                </Button>
              )}
            </>
          )}
        </div>
        <div className='pbs-1'>
          <Input.Switch classNames='self-center' checked={isEnabled} onClick={handleChange} />
        </div>
      </ListItem.Root>
    </Input.Root>
  );
};
