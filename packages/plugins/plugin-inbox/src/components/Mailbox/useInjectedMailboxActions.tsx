//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { InboxCapabilities, type Mailbox } from '../../types';
import { type MailboxExtractorMenuItem } from './useMailboxExtractorActions';

/**
 * Returns a menu item per injected {@link InboxCapabilities.MailboxAction}. Selecting one invokes the
 * contributed operation over the mailbox, scoped to its space — the injection path other plugins use
 * to add mailbox toolbar actions (e.g. plugin-brain's `Analyze`) without depending on the toolbar.
 */
export const useInjectedMailboxActions = (mailbox: Mailbox.Mailbox): MailboxExtractorMenuItem[] => {
  const actions = useCapabilities(InboxCapabilities.MailboxAction);
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);

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
