//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Theme from '@dxos/react-ui/Theme';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Typography from '@dxos/react-ui/Typography';
import { getSize, mx, textValence } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { type AgentFormProps } from '../DeviceList/index.ts';

// TODO(burdon): Deprecated? Docs required.
export const AgentConfig = ({
  agentStatus,
  validationMessage,
  onAgentDestroy,
  onAgentCreate,
  onAgentRefresh,
}: Omit<AgentFormProps, 'agentHostingEnabled'>) => {
  const { t } = Hooks.useTranslation(translationKey);
  const labelId = Hooks.useId('agentConfig__label');
  return (
    <div className='p-1'>
      <h2 className={mx('text-fg-muted', 'text-center mt-2')}>{t('agent.heading')}</h2>
      {validationMessage && (
        <p role='alert' className={mx(textValence('error'), 'my-2')}>
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
            <Avatar.Root
              aria-labelledby={labelId}
              status={agentStatus === 'created' ? 'warning' : 'inactive'}
              variant='square'
              classNames={['place-self-center', agentStatus !== 'created' && 'opactiy-50']}
              icon='ph--database--duotone'
            />
            <span id={labelId} className='flex-1 text-sm truncate'>
              {t(
                agentStatus === 'created'
                  ? 'agent requested label'
                  : agentStatus === 'creating'
                    ? 'creating agent label'
                    : agentStatus === 'destroying'
                      ? 'destroying agent label'
                      : 'getting agent label',
              )}
            </span>
            {agentStatus === 'created' && (
              <Tooltip.Trigger asChild content={t('destroy-agent.label')} side='bottom'>
                <Button.Root
                  variant='ghost'
                  classNames='px-0 w-(--dx-rail-action) h-(--dx-rail-action)'
                  data-testid='agent.destroy'
                  label={t('destroy-agent.label')}
                  icon='ph--power--regular'
                  iconOnly
                  onClick={onAgentDestroy}
                />
              </Tooltip.Trigger>
            )}
          </div>
          {agentStatus === 'created' && (
            <p id='devices-panel.create-agent.description' className={mx('text-fg-muted', 'my-2')}>
              {t('agent-requested.description')}
            </p>
          )}
        </>
      ) : (
        <>
          <Button.Root
            variant='ghost'
            classNames='my-2 w-full justify-start gap-2 ps-0 pe-3'
            data-testid={agentStatus === 'creatable' ? 'devices-panel.create-agent' : 'devices-panel.agent-error'}
            onClick={agentStatus === 'creatable' ? onAgentCreate : onAgentRefresh}
            aria-describedby='devices-panel.create-agent.description'
          >
            <div role='img' className={mx(getSize(8), 'm-1 rounded-xs bg-input-surface grid place-items-center')}>
              {agentStatus === 'creatable' ? (
                <Icon.Icon icon='ph--plus--light' size='xl' />
              ) : (
                <Icon.Icon icon='ph--arrows-clockwise--light' size='xl' />
              )}
            </div>
            <span className='grow font-medium text-start'>
              {t(agentStatus === 'creatable' ? 'create-agent.label' : '')}
            </span>
          </Button.Root>
          {agentStatus === 'creatable' && (
            <div className='space-y-2' id='devices-panel.create-agent.description'>
              <p className='text-fg-muted'>
                <Theme.Trans
                  {...{
                    t,
                    i18nKey: 'create-agent-clickwrap',
                    components: {
                      tosLink: <Typography.Link />,
                    },
                  }}
                />
              </p>
              <p className='text-fg-muted'>{t('create-agent.description')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
