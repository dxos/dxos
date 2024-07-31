//
// Copyright 2024 DXOS.org
//

import { ArrowsClockwise, Database, Plus, Power } from '@phosphor-icons/react';
import React from 'react';

import { Avatar, Button, Link, Tooltip, Trans, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx, valenceColorText } from '@dxos/react-ui-theme';

import { type AgentFormProps } from './DeviceList';

export const AgentConfig = ({
  agentStatus,
  validationMessage,
  onAgentDestroy,
  onAgentCreate,
  onAgentRefresh,
}: Omit<AgentFormProps, 'agentHostingEnabled'>) => {
  const { t } = useTranslation('os');
  return (
    <>
      <h2 className={mx(descriptionText, 'text-center mbs-4')}>{t('agent heading')}</h2>
      {validationMessage && (
        <p role='alert' className={mx(valenceColorText('error'), 'mlb-2')}>
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
            className='mlb-2 flex gap-2 items-center'
            aria-describedby='devices-panel.create-agent.description'
          >
            <Avatar.Root status={agentStatus === 'created' ? 'warning' : 'inactive'} variant='square'>
              <Avatar.Frame classNames='place-self-center'>
                <Database
                  weight='duotone'
                  width={24}
                  height={24}
                  x={8}
                  y={8}
                  {...(agentStatus !== 'created' && { className: 'opacity-50' })}
                />
              </Avatar.Frame>
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
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button
                    variant='ghost'
                    classNames='pli-0 is-[--rail-action] bs-[--rail-action]'
                    data-testid='agent.destroy'
                    onClick={onAgentDestroy}
                  >
                    <span className='sr-only'>{t('destroy agent label')}</span>
                    <Power className={getSize(5)} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side='bottom' classNames='z-50'>
                    {t('destroy agent label')}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </div>
          {agentStatus === 'created' && (
            <p id='devices-panel.create-agent.description' className={mx(descriptionText, 'mlb-2')}>
              {t('agent requested description')}
            </p>
          )}
        </>
      ) : (
        <>
          <Button
            variant='ghost'
            classNames='mlb-2 is-full justify-start gap-2 !pis-0 !pie-3'
            data-testid={agentStatus === 'creatable' ? 'devices-panel.create-agent' : 'devices-panel.agent-error'}
            onClick={agentStatus === 'creatable' ? onAgentCreate : onAgentRefresh}
            aria-describedby='devices-panel.create-agent.description'
          >
            <div role='img' className={mx(getSize(8), 'm-1 rounded-sm surface-input grid place-items-center')}>
              {agentStatus === 'creatable' ? (
                <Plus weight='light' className={getSize(6)} />
              ) : (
                <ArrowsClockwise weight='light' className={getSize(6)} />
              )}
            </div>
            <span className='grow font-medium text-start'>
              {t(agentStatus === 'creatable' ? 'create agent label' : '')}
            </span>
          </Button>
          {agentStatus === 'creatable' && (
            <div role='none' className='space-y-2' id='devices-panel.create-agent.description'>
              <p className={descriptionText}>
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
              <p className={descriptionText}>{t('create agent description')}</p>
            </div>
          )}
        </>
      )}
    </>
  );
};
