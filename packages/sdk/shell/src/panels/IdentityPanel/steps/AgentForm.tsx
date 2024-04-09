//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';

import { Action, Actions, StepHeading, Input, type AgentFormProps } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';

export const AgentForm = (props: IdentityPanelStepProps & AgentFormProps) => {
  const {
    active,
    onAgentCreate,
    onAgentDestroy,
    send,
    validationMessage,
    agentStatus,
    agentActive,
    agentProviderDisabled,
  } = props;
  const disabled = !active;
  const { t } = useTranslation('os');
  return (
    <>
      <div role='none' className='grow flex flex-col justify-center'>
        <Input
          {...{ validationMessage }}
          label={<StepHeading>Agent Status</StepHeading>}
          disabled={disabled}
          data-testid='agent-status'
          value={agentStatus}
        />
      </div>
      <Actions>
        <Action
          disabled={agentActive || agentProviderDisabled}
          onClick={() => onAgentCreate?.()}
          data-testid={'create-agent'}
        >
          Create Agent
        </Action>
        <Action
          disabled={!agentActive || agentProviderDisabled}
          onClick={() => onAgentDestroy?.()}
          data-testid={'destroy-agent'}
        >
          Destroy Agent
        </Action>
        <Action
          disabled={disabled}
          onClick={() => send?.({ type: 'unchooseAction' })}
          data-testid={'update-profile-form-back'}
        >
          {t('back label')}
        </Action>
      </Actions>
    </>
  );
};
