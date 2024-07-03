//
// Copyright 2024 DXOS.org
//

import { ArrowsClockwise, Database, Plus, Power } from '@phosphor-icons/react';
import React from 'react';

import { type Device } from '@dxos/react-client/halo';
import { Avatar, Button, Link, Tooltip, Trans, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx, valenceColorText } from '@dxos/react-ui-theme';

import { type AgentFormProps } from './DeviceList';

export const AgentConfig = ({
  agentDevice,
  agentStatus,
  validationMessage,
  onAgentDestroy,
  onAgentCreate,
  onAgentRefresh,
}: Omit<AgentFormProps, 'agentHostingEnabled'> & { agentDevice?: Device }) => {
  const { t } = useTranslation('os');
  return (
    <>
      <h2 className={mx(descriptionText, 'text-center mbs-4')}>{t('agent heading')}</h2>
      {validationMessage && (
        <p role='alert' className={mx(valenceColorText('error'), 'mlb-2')}>
          {validationMessage}
        </p>
      )}
      {agentStatus === 'online' ||
      agentStatus === 'creating' ||
      agentStatus === 'getting' ||
      agentStatus === 'destroying' ? (
        <>
          <div
            role='group'
            className='mlb-2 flex gap-2 items-center'
            aria-describedby='devices-panel.create-agent.description'
          >
            <Avatar.Root
              status={agentDevice ? 'active' : agentStatus === 'online' ? 'warning' : 'inactive'}
              variant='square'
            >
              <Avatar.Frame classNames='place-self-center'>
                <Database
                  weight='duotone'
                  width={24}
                  height={24}
                  x={8}
                  y={8}
                  {...(agentStatus !== 'online' && !agentDevice && { className: 'opacity-50' })}
                />
              </Avatar.Frame>
              <Avatar.Label classNames='flex-1 text-sm truncate'>
                {t(
                  agentStatus === 'online'
                    ? agentDevice
                      ? 'agent device label'
                      : 'agent requested label'
                    : agentStatus === 'creating'
                      ? 'creating agent label'
                      : agentStatus === 'destroying'
                        ? 'destroying agent label'
                        : 'getting agent label',
                )}
              </Avatar.Label>
            </Avatar.Root>
            {agentStatus === 'online' && (
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
          {!agentDevice && agentStatus === 'online' && (
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
            data-testid={agentStatus === 'ready' ? 'devices-panel.create-agent' : 'devices-panel.agent-error'}
            onClick={agentStatus === 'ready' ? onAgentCreate : onAgentRefresh}
            aria-describedby='devices-panel.create-agent.description'
          >
            <div role='img' className={mx(getSize(8), 'm-1 rounded-sm surface-input grid place-items-center')}>
              {agentStatus === 'ready' ? (
                <Plus weight='light' className={getSize(6)} />
              ) : (
                <ArrowsClockwise weight='light' className={getSize(6)} />
              )}
            </div>
            <span className='grow font-medium text-start'>
              {t(agentStatus === 'ready' ? 'create agent label' : '')}
            </span>
          </Button>
          {agentStatus === 'ready' && (
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
