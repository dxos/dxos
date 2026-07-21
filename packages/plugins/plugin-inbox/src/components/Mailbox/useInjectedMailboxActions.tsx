//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Capabilities } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { type InboxCapabilities, type Mailbox } from '../../types';
import { type MailboxExtractorMenuItem } from './useMailboxExtractorActions';

/**
 * Returns a menu item per injected {@link InboxCapabilities.MailboxAction}. Selecting one invokes the
 * contributed operation over the mailbox, scoped to its space — the injection path other plugins use
 * to add mailbox toolbar actions (e.g. plugin-brain's `Analyze`) without depending on the toolbar.
 *
 * `actions` and `invoker` are resolved by the container (this hook lives under `components/`, which
 * must not call capability hooks) — see the `MailboxArticle` wiring.
 */
export const useInjectedMailboxActions = (
  mailbox: Mailbox.Mailbox,
  actions: readonly InboxCapabilities.MailboxAction[] = [],
  invoker?: Capabilities.OperationInvoker,
): MailboxExtractorMenuItem[] => {
  return useMemo(() => {
    if (!invoker) {
      return [];
    }

    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return [];
    }

    return actions.map((action) => ({
      id: action.id,
      label: action.label,
      onSelect: () => {
        const { operation, input } = action.createInvocation(mailbox);
        void invoker
          .invokePromise(operation, input, { spaceId: db.spaceId })
          .then((result) => {
            if (result.error) {
              log.warn('mailbox action failed', { id: action.id, err: result.error });
              return;
            }
            log.info('mailbox action complete', { id: action.id });
          })
          .catch((err) => log.warn('mailbox action failed', { id: action.id, err }));
      },
    }));
  }, [actions, invoker, mailbox]);
};
