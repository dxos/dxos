//
// Copyright 2023 DXOS.org
//

import React, { useState, useCallback, useEffect } from 'react';
import { type Event, type SingleOrArray } from 'xstate';

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
  const agentHostingProviderClient = useAgentHostingProviderClient();

  useEffect(() => {
    const fetchAgentStatus = async () => {
      // TODO(nf): if agent exists, subscribe to updates instead of oneshot status
      const agentStatus = await agentHostingProviderClient?.getAgent(identity?.identityKey.truncate() ?? 'foo');
      if (agentStatus) {
        setAgentActive(true);
        setAgentStatus(agentStatus);
      } else {
        setAgentActive(false);
        setValidationMessage('No agent deployed via provider.');
      }
    };
    void fetchAgentStatus();
  }, []);

  const onAgentCreateEvent = useCallback(async (invitation: Invitation) => {
    const invitationCode = InvitationEncoder.encode(invitation);
    if (invitation.state === Invitation.State.CONNECTING) {
      console.log(JSON.stringify({ invitationCode, authCode: invitation.authCode }));
      if (!identity) {
        setValidationMessage('Identity not found?');
        console.error('Identity not found');
        return;
      }
      agentHostingProviderClient
        ?.createAgent(invitationCode, identity.identityKey.truncate())
        .then((res) => {
          console.log(res);
          if (res) {
            setAgentStatus(res);
            setAgentActive(true);
            setValidationMessage('');
          } else {
            setValidationMessage('error creating agent');
          }
        })
        .catch((error) => {
          // TODO(nf): feedback on error
          setValidationMessage('error creating agent');
        });
      // TODO(nf): feedback on response
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
    if (!identity) {
      console.error('Identity not found');
      return;
    }
    agentHostingProviderClient
      ?.destroyAgent(identity.identityKey.truncate())
      .then((res) => {
        if (res) {
          setValidationMessage('No agent deployed via provider.');
          setAgentStatus('');
          setAgentActive(false);
        } else {
          // TODO(nf): feedback on error
          setValidationMessage('error destroying agent.');
        }
      })
      .catch((error) => {
        setValidationMessage('error destroying agent.');
      });
  };

  return (
    <AgentFormImpl
      {...props}
      onAgentCreate={handleAgentCreate}
      onAgentDestroy={handleAgentDestroy}
      validationMessage={validationMessage}
      agentStatus={agentStatus}
      agentActive={agentActive}
    />
  );
};

// TODO(zhenyasav): impl shouldn't need send()
export const AgentFormImpl = (props: AgentFormImplProps) => {
  const { active, onAgentCreate, onAgentDestroy, send, validationMessage, agentStatus, agentActive } = props;
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
        <Action disabled={agentActive} onClick={() => onAgentCreate?.()} data-testid={'create-agent'}>
          Create Agent
        </Action>
        <Action disabled={!agentActive} onClick={() => onAgentDestroy?.()} data-testid={'destroy-agent'}>
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
