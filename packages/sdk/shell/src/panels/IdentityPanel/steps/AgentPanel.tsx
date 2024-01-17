//
// Copyright 2023 DXOS.org
//

import React, { useState, useCallback, useEffect } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

import { invariant } from '@dxos/invariant';
import { useClient, useAgentHostingProviderClient } from '@dxos/react-client';
import { type Identity, useHaloInvitations } from '@dxos/react-client/halo';
import { Invitation, InvitationEncoder } from '@dxos/react-client/invitations';
import { useTranslation } from '@dxos/react-ui';

import { Action, Actions, StepHeading, Input } from '../../../components';
import { type IdentityPanelStepProps } from '../IdentityPanelProps';
import { type IdentityEvent } from '../identityMachine';

export interface AgentFormProps extends Omit<IdentityPanelStepProps, 'send'> {
  send?: (event: SingleOrArray<Event<IdentityEvent>>) => void;
  onAgentCreate?: () => Promise<void>;
  onAgentDestroy?: () => Promise<void>;
  identity?: Identity;
}

export type AgentFormImplProps = AgentFormProps & {
  agentStatus?: string;
  agentActive?: boolean;
  agentProviderDisabled?: boolean;
  validationMessage?: string;
};

export const AgentForm = (props: AgentFormProps) => {
  const { identity } = props;
  // const { t } = useTranslation('os');
  const [validationMessage, setValidationMessage] = useState('');
  const [agentStatus, setAgentStatus] = useState('');
  const [agentActive, setAgentActive] = useState(false);
  const client = useClient();
  const invitations = useHaloInvitations();
  const agentHostingProviderClient = useAgentHostingProviderClient(client.config);

  useEffect(() => {
    const fetchAgentStatus = async () => {
      // TODO(nf): if agent exists, subscribe to updates instead of oneshot status
      if (agentHostingProviderClient) {
        const agentStatus = await agentHostingProviderClient?.getAgent(identity?.identityKey.truncate() ?? 'foo');
        if (agentStatus) {
          setAgentActive(true);
          setAgentStatus(agentStatus);
        } else {
          setAgentActive(false);
          setValidationMessage('No agent deployed via provider.');
        }
      } else {
        setValidationMessage('No agent provider configured.');
      }
    };
    void fetchAgentStatus();
  }, []);

  const onAgentCreateEvent = useCallback(async (invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
      invariant(identity, 'Identity not found');
      if (agentHostingProviderClient) {
        try {
          const res = await agentHostingProviderClient?.createAgent(invitationCode, identity.identityKey.truncate());
          // TODO(nf): human-consumable response from API
          setAgentStatus(res);
          setAgentActive(true);
          setValidationMessage('');
        } catch (err: any) {
          setValidationMessage(`error creating agent: ${err.message}`);
        }
      }
    }
  }, []);

  const handleAgentCreate = async () => {
    invitations.forEach((invitation) => invitation.cancel());

    // TODO(nf): do this work in the hosting provider client?
    const invitation = client.halo.share({ type: Invitation.Type.MULTIUSE, authMethod: Invitation.AuthMethod.NONE });

    invitation.subscribe(onAgentCreateEvent);
  };

  const handleAgentDestroy = async () => {
    const identity = client.halo.identity.get();
    invariant(identity, 'Identity not found');
    try {
      await agentHostingProviderClient?.destroyAgent(identity.identityKey.truncate());
      setValidationMessage('No agent deployed via provider.');
      setAgentStatus('');
      setAgentActive(false);
    } catch (err: any) {
      setValidationMessage(`error destroying agent: ${err.message}`);
    }
  };

  return (
    <AgentFormImpl
      {...props}
      onAgentCreate={handleAgentCreate}
      onAgentDestroy={handleAgentDestroy}
      validationMessage={validationMessage}
      agentStatus={agentStatus}
      agentActive={agentActive}
      agentProviderDisabled={!agentHostingProviderClient}
    />
  );
};

// TODO(zhenyasav): impl shouldn't need send()
export const AgentFormImpl = (props: AgentFormImplProps) => {
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
