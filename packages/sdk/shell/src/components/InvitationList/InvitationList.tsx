//
// Copyright 2023 DXOS.org
//
import React, { type ComponentType, useCallback, useMemo, useRef } from 'react';

import type { CancellableInvitationObservable } from '@dxos/react-client/invitations';
import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';

import { translationKey } from '../../translations.ts';
import { InvitationListItem, type InvitationListItemProps, InvitationOpenContext } from './InvitationListItem.tsx';
import { type SharedInvitationListProps } from './InvitationListProps.ts';

export interface InvitationListProps
  extends Omit<InvitationListItemProps, 'invitation' | 'value'>, Pick<SharedInvitationListProps, 'send'> {
  invitations: CancellableInvitationObservable[];
  InvitationListItem?: ComponentType<InvitationListItemProps>;
}

/**
 * The invitations as a Listbox: the arrow keys move through the rows, and Enter or a click on a shareable row opens its
 * QR view; each row's x cancels or removes it without picking the row.
 */
export const InvitationList = ({
  invitations,
  send,
  InvitationListItem: Item = InvitationListItem,
  ...invitationProps
}: InvitationListProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const openers = useRef(new Map<string, () => void>());
  const register = useCallback((id: string, open: (() => void) | undefined) => {
    if (open) {
      openers.current.set(id, open);
    } else {
      openers.current.delete(id);
    }
  }, []);
  const items = useMemo(
    () =>
      invitations.map((invitation) => {
        const value = invitation.get().invitationId;
        return { value, label: value };
      }),
    [invitations],
  );
  return (
    <InvitationOpenContext.Provider value={register}>
      {/* Held at no value, so opening the same invitation again still reports it. */}
      <Listbox.Root items={items} value='' onValueChange={(value) => openers.current.get(value)?.()}>
        <Listbox.Content aria-label={t('invitation-list.heading')} data-testid='invitation-list'>
          {invitations.map((invitation) => (
            <Item key={invitation.get().invitationId} send={send} invitation={invitation} {...invitationProps} />
          ))}
        </Listbox.Content>
      </Listbox.Root>
    </InvitationOpenContext.Provider>
  );
};
