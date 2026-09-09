//
// Copyright 2026 DXOS.org
//

import { useAtom, useAtomSet } from '@effect/atom-react/Hooks';
import React, { useCallback, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { Context } from '@dxos/context';
import { Clipboard, Flex, Icon, IconButton, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { AccountCache, ClientCapabilities } from '#types';

import { useEdgeHttpClient } from '../../hooks';

export const InvitationsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const accountCacheAtom = useCapability(ClientCapabilities.AccountCache);
  const [cache] = useAtom(accountCacheAtom);
  const setCache = useAtomSet(accountCacheAtom);
  const [pending, setPending] = useState(false);

  const edgeClient = useEdgeHttpClient();

  useAsyncEffect(async () => {
    if (!edgeClient) {
      return;
    }

    try {
      const result = await edgeClient.listAccountInvitations(new Context());
      setCache((prev) => ({ ...prev, invitations: result.invitations, fetchedAt: Date.now() }));
    } catch {
      // Offline: keep cache.
    }
  }, [edgeClient, setCache]);

  const handleIssue = useCallback(async () => {
    if (!edgeClient) {
      return;
    }
    setPending(true);
    try {
      const result = await edgeClient.issueAccountInvitation(new Context());
      // Optimistically push the new code and decrement the remaining quota; the
      // server consumes one slot at issue time. Next refresh reconciles.
      setCache((prev) => ({
        ...prev,
        account: prev.account
          ? { ...prev.account, invitationsRemaining: Math.max(0, prev.account.invitationsRemaining - 1) }
          : prev.account,
        invitations: [{ code: result.code, createdAt: new Date().toISOString() }, ...(prev.invitations ?? [])],
      }));
    } finally {
      setPending(false);
    }
  }, [edgeClient, setCache]);

  const remaining = cache.account?.invitationsRemaining ?? 0;
  const list = cache.invitations ?? [];
  const available = list.filter((row) => !row.redeemedByIdentityDid);
  const redeemed = list.filter((row) => Boolean(row.redeemedByIdentityDid));

  return (
    <Clipboard.Provider>
      <Form.Root variant='settings'>
        <Form.Viewport scroll>
          <Form.Content>
            <Form.FieldSet label={t('invitations-section.title')} description={t('invitations-section.description')}>
              <Form.Field
                standalone
                label={t('generate-invitation.label')}
                description={t('generate-invitation.description', { count: remaining })}
              >
                <IconButton
                  icon='ph--plus--regular'
                  label={t('generate-invitation.label')}
                  variant='primary'
                  onClick={handleIssue}
                  disabled={pending || remaining <= 0}
                />
              </Form.Field>
            </Form.FieldSet>

            {available.length > 0 ? (
              <Form.FieldSet label={t('available-invitations.title')}>
                <Listbox.Root>
                  <Listbox.Content classNames='gap-1'>
                    {available.map((row) => (
                      <AvailableInvitationItem key={row.code} row={row} />
                    ))}
                  </Listbox.Content>
                </Listbox.Root>
              </Form.FieldSet>
            ) : null}

            {redeemed.length > 0 ? (
              <Form.FieldSet label={t('redeemed-invitations.title')}>
                <Listbox.Root>
                  <Listbox.Content classNames='gap-1'>
                    {redeemed.map((row) => (
                      <RedeemedInvitationItem key={row.code} row={row} />
                    ))}
                  </Listbox.Content>
                </Listbox.Root>
              </Form.FieldSet>
            ) : null}
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </Clipboard.Provider>
  );
};

const AvailableInvitationItem = ({ row }: { row: AccountCache.AccountCacheInvitation }) => (
  <Listbox.Item id={row.code} classNames='grid grid-cols-[min-content_1fr_min-content] items-center gap-2'>
    <Icon icon='ph--paper-plane-tilt--duotone' size={5} classNames='text-description' />
    <Flex column classNames='min-w-0'>
      <div className='font-mono truncate'>{row.code}</div>
      <p className='text-description text-xs'>{new Date(row.createdAt).toLocaleString()}</p>
    </Flex>
    <Clipboard.IconButton value={row.code} />
  </Listbox.Item>
);

const RedeemedInvitationItem = ({ row }: { row: AccountCache.AccountCacheInvitation }) => {
  const date = row.redeemedAt ?? row.createdAt;
  return (
    <Listbox.Item id={row.code} classNames='grid grid-cols-[min-content_1fr] items-center gap-2'>
      <Icon icon='ph--check-circle--duotone' size={5} classNames='text-success-text' />
      <Flex column classNames='min-w-0'>
        <div className='font-mono truncate'>{row.code}</div>
        <p className='text-description text-xs'>{new Date(date).toLocaleString()}</p>
      </Flex>
    </Listbox.Item>
  );
};

InvitationsContainer.displayName = 'InvitationsContainer';
