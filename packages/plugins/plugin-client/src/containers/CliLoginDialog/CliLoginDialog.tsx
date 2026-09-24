//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { EffectEx } from '@dxos/effect';
import { type Invitation } from '@dxos/halo';
import { useIdentity, useInvitationFlow } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { AlertDialog, Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { ClientCapabilities, CliLogin } from '#types';

export type CliLoginDialogProps = {
  /** The CLI's loopback callback, already checked by {@link CliLogin.parseCallback}. */
  callback: string;
  /** The CLI's state, which the terminal prints too so the user can match the two. */
  state: string;
};

type Status = 'confirm' | 'sending' | 'waiting' | 'success' | 'error';

/**
 * Approves a `dx` CLI on this machine as a new device of the current identity.
 *
 * The invitation authenticates with a known public key, whose keypair travels inside the code, so
 * the CLI joins without an auth-code round trip. That makes the code a bearer credential, which is
 * why it is only created on an explicit click and only sent to a loopback callback.
 */
export const CliLoginDialog = ({ callback, state }: CliLoginDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const identity = useIdentity();
  const [identityService] = useCapabilities(ClientCapabilities.IdentityService);
  const [flow, setFlow] = useState<Invitation.Flow>();
  const [status, setStatus] = useState<Status>('confirm');
  const [error, setError] = useState<string>();
  const { event } = useInvitationFlow(flow);
  // The flow still to cancel on close: set once created, cleared on any terminal event.
  const flowRef = useRef<Invitation.Flow | undefined>(undefined);

  const close = useCallback(() => invokePromise(LayoutOperation.UpdateDialog, { state: false }), [invokePromise]);

  // Closing mid-flow must stop the host listening, or the invitation outlives the dialog.
  useEffect(
    () => () => {
      if (flowRef.current) {
        void EffectEx.runPromise(flowRef.current.cancel()).catch((err) => log.catch(err));
      }
    },
    [],
  );

  useEffect(() => {
    switch (event?._tag) {
      case 'success':
        flowRef.current = undefined;
        setStatus('success');
        break;
      case 'cancelled':
      case 'error':
        flowRef.current = undefined;
        setError(event._tag === 'error' ? event.message : t('cli-login-cancelled.message'));
        setStatus('error');
        break;
    }
  }, [event?._tag]);

  const handleAuthorize = useCallback(async () => {
    const target = CliLogin.parseCallback(callback);
    if (!identityService || !target) {
      return;
    }
    setStatus('sending');
    try {
      const created = await EffectEx.runPromise(identityService.share({ authMethod: 'known-public-key' }));
      flowRef.current = created;
      setFlow(created);
      const code = await EffectEx.runPromise(created.code);
      // `no-cors`: the loopback server sends no CORS headers and the response carries nothing needed
      // here; the flow's own events report whether the CLI joined.
      await fetch(CliLogin.createCallbackUrl(target, code, state), { mode: 'no-cors' });
      setStatus('waiting');
    } catch (err) {
      log.catch(err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [identityService, callback, state]);

  return (
    <AlertDialog.Content size='md'>
      <AlertDialog.Body>
        <AlertDialog.Title>{t('cli-login-dialog.title')}</AlertDialog.Title>
        <AlertDialog.Description classNames='py-2'>
          {identity ? t('cli-login-dialog.description') : t('cli-login-no-identity.message')}
        </AlertDialog.Description>
        {identity && (
          <div className='py-2'>
            <p className='text-sm text-subdued'>{t('cli-login-code.label')}</p>
            <p className='py-2 font-mono text-2xl tracking-widest text-center' data-testid='cliLogin.state'>
              {state}
            </p>
          </div>
        )}
        <p className='py-2 text-sm' data-testid='cliLogin.status' data-status={status}>
          {status === 'sending' && t('cli-login-sending.message')}
          {status === 'waiting' && t('cli-login-waiting.message')}
          {status === 'success' && t('cli-login-success.message')}
          {status === 'error' && t('cli-login-error.message', { error })}
        </p>
      </AlertDialog.Body>
      <AlertDialog.ActionBar>
        {status === 'confirm' || status === 'sending' ? (
          <>
            <AlertDialog.Cancel asChild>
              <Button data-testid='cliLogin.deny' onClick={close}>
                {t('cli-login-deny.label')}
              </Button>
            </AlertDialog.Cancel>
            <Button
              data-testid='cliLogin.authorize'
              variant='primary'
              disabled={!identity || status === 'sending'}
              onClick={handleAuthorize}
            >
              {t('cli-login-authorize.label')}
            </Button>
          </>
        ) : (
          <AlertDialog.Action asChild>
            <Button data-testid='cliLogin.done' variant={status === 'success' ? 'primary' : 'default'} onClick={close}>
              {t('cli-login-done.label')}
            </Button>
          </AlertDialog.Action>
        )}
      </AlertDialog.ActionBar>
    </AlertDialog.Content>
  );
};

CliLoginDialog.displayName = 'CliLoginDialog';
