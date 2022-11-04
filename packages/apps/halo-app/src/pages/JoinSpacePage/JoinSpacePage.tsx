//
// Copyright 2021 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { PublicKey } from '@dxos/keys';
import { useClient, useProfile } from '@dxos/react-client';
import { Dialog, DialogProps, Heading, SingleInputStep, useTranslation } from '@dxos/react-uikit';

import { InvitationReducerStatus, useInvitation } from '../../experimental';
import { InvitationStatus } from '../../experimental/InvitationStatus';

/**
 *
 */
export const JoinSpacePage = () => {
  const { t } = useTranslation();

  return (
    <main className='max-is-lg mli-auto pli-7 mbs-7'>
      <Heading>{t('join space label', { ns: 'uikit' })}</Heading>
      <JoinSpacePanel />
    </main>
  );
};

// TODO(wittjosiah): Factor out.
export const JoinSpaceDialog = (props: Partial<DialogProps>) => {
  const { t } = useTranslation();

  return (
    <Dialog title={t('join space label', { ns: 'uikit' })} {...props}>
      <JoinSpacePanel />
    </Dialog>
  );
};

// TODO(wittjosiah): Factor out.
export const JoinSpacePanel = () => {
  const { t } = useTranslation();
  const _client = useClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationParam = searchParams.get('invitation');
  const [invitationCode, setInvitationCode] = useState(invitationParam ?? '');
  const [invitationSecret, setInvitationSecret] = useState('');
  const profile = useProfile();

  const {
    status,
    haltedAt,
    connect,
    cancel,
    validate,
    error,
    secret,
    result: [space, _me]
  } = useInvitation(profile!.publicKey);

  const onConnectNext = useCallback(() => {
    void connect(PublicKey.random());
  }, [invitationCode]);

  const onValidateNext = useCallback(() => {
    void validate(invitationSecret);
  }, [invitationSecret]);

  useEffect(() => {
    if (invitationParam) {
      onConnectNext();
    }
  }, []);

  useEffect(() => {
    if (secret) {
      console.log('[secret]', secret);
    }
  }, [secret]);

  useEffect(() => {
    if (status === InvitationReducerStatus.done && space) {
      navigate(`#/spaces/${space.key.toHex()}`);
    }
  }, [status, space]);

  const cursor = status < 0 ? haltedAt! : status;

  return (
    <>
      <InvitationStatus {...{ status, haltedAt }} className='mbs-3' />
      {cursor < InvitationReducerStatus.ready ? (
        <SingleInputStep
          {...{
            pending: status === InvitationReducerStatus.connecting,
            inputLabel: t('invitation code label', { ns: 'uikit' }),
            inputPlaceholder: t('invitation code placeholder', { ns: 'uikit' }),
            inputProps: {
              initialValue: invitationCode,
              autoFocus: true
            },
            onChange: setInvitationCode,
            onNext: onConnectNext,
            onCancelPending: cancel,
            ...(error && {
              inputProps: {
                validationMessage: error.message,
                validationValence: 'error'
              }
            })
          }}
        />
      ) : (
        <SingleInputStep
          {...{
            pending: status === InvitationReducerStatus.validating,
            inputLabel: t('invitation secret label', { ns: 'uikit' }),
            inputPlaceholder: t('invitation secret placeholder', { ns: 'uikit' }),
            inputProps: {
              initialValue: '',
              autoFocus: true
            },
            onChange: setInvitationSecret,
            onNext: onValidateNext,
            onCancelPending: cancel,
            ...(error && {
              inputProps: {
                validationMessage: error.message,
                validationValence: 'error'
              }
            })
          }}
        />
      )}
    </>
  );
};
