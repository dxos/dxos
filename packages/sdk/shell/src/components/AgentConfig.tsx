//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Avatar, Button, Icon, IconButton, Link, Tooltip, Trans, useTranslation } from '@dxos/react-ui';
import { getSize, mx, valenceColorText } from '@dxos/ui-theme';

import { translationKey } from '../translations';

import { type AgentFormProps } from './DeviceList';

export const AgentConfig = ({
  agentStatus,
  validationMessage,
  onAgentDestroy,
  onAgentCreate,
  onAgentRefresh,
}: Omit<AgentFormProps, 'agentHostingEnabled'>) => {
  const { t } = useTranslation(translationKey);
  return (
    <div role='none' className='p-1'>
      <h2 className={mx('text-description', 'text-center mt-2')}>{t('agent heading')}</h2>
      {validationMessage && (
        <p role='alert' className={mx(valenceColorText('error'), 'my-2')}>
          {validationMessage}
        </p>
      )}
      {agentStatus === 'created' ||
      agentStatus === 'creating' ||
      agentStatus === 'getting' ||
      agentStatus === 'destroying' ? (
        <>
          <div
            role='group'
            className='my-2 flex gap-2 items-center'
            aria-describedby='devices-panel.create-agent.description'
          >
            <Avatar.Root>
              <Avatar.Content
                status={agentStatus === 'created' ? 'warning' : 'inactive'}
                variant='square'
                classNames={['place-self-center', agentStatus !== 'created' && 'opactiy-50']}
                icon='ph--database--duotone'
              />
              <Avatar.Label classNames='flex-1 text-sm truncate'>
                {t(
                  agentStatus === 'created'
                    ? 'agent requested label'
                    : agentStatus === 'creating'
                      ? 'creating agent label'
                      : agentStatus === 'destroying'
                        ? 'destroying agent label'
                        : 'getting agent label',
                )}
              </Avatar.Label>
            </Avatar.Root>
            {agentStatus === 'created' && (
              <Tooltip.Trigger asChild content={t('destroy agent label')} side='bottom'>
                <IconButton
                  variant='ghost'
                  classNames='px-0 w-(--rail-action) h-(--rail-action)'
                  data-testid='agent.destroy'
                  label={t('destroy agent label')}
                  icon='ph--power--regular'
                  iconOnly
                  onClick={onAgentDestroy}
                />
              </Tooltip.Trigger>
            )}
          </div>
          {agentStatus === 'created' && (
            <p id='devices-panel.create-agent.description' className={mx('text-description', 'my-2')}>
              {t('agent requested description')}
            </p>
          )}
        </>
      ) : (
        <>
          <Button
            variant='ghost'
            classNames='my-2 w-full justify-start gap-2 ps-0 pe-3'
            data-testid={agentStatus === 'creatable' ? 'devices-panel.create-agent' : 'devices-panel.agent-error'}
            onClick={agentStatus === 'creatable' ? onAgentCreate : onAgentRefresh}
            aria-describedby='devices-panel.create-agent.description'
          >
            <div role='img' className={mx(getSize(8), 'm-1 rounded-xs bg-input-surface grid place-items-center')}>
              {agentStatus === 'creatable' ? (
                <Icon icon='ph--plus--light' size={6} />
              ) : (
                <Icon icon='ph--arrows-clockwise--light' size={6} />
              )}
            </div>
            <span className='grow font-medium text-start'>
              {t(agentStatus === 'creatable' ? 'create agent label' : '')}
            </span>
          </Button>
          {agentStatus === 'creatable' && (
            <div role='none' className='space-y-2' id='devices-panel.create-agent.description'>
              <p className='text-description'>
                <Trans
                  {...{
                    t,
                    i18nKey: 'create agent clickwrap',
                    components: {
                      tosLink: <Link target='_blank' rel='noreferrer' />,
                    },
                  }}
                />
              </p>
              <p className='text-description'>{t('create agent description')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
