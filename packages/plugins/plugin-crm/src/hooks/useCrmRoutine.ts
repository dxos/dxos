//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Routine, Trigger } from '@dxos/compute';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { useObject, useQuery } from '@dxos/react-client/echo';

import { CrmOperation } from '../types';

/**
 * Returns true when `trigger` is the CRM trigger for the given mailbox.
 *
 * Identity (all conditions must hold):
 *  1. `spec.kind === 'feed'` and the feed URI matches the mailbox's feed URI
 *     (this is the primary association — the trigger fires on this mailbox's feed).
 *  2. `input.prompt` exists (pointing to a Routine).
 */
const isCrmTrigger = (trigger: Trigger.Trigger, mailboxFeedUri: string): boolean => {
  if (trigger.spec?.kind !== 'feed') {
    return false;
  }
  // After the kind guard above, spec is narrowed to FeedSpec.
  const feedUri = trigger.spec.feed?.uri;
  if (!feedUri || feedUri !== mailboxFeedUri) {
    return false;
  }
  // A feed trigger for this mailbox is a CRM trigger when it has a routine prompt input.
  return Boolean(trigger.input?.prompt);
};

/**
 * Finds the CRM trigger and its routine for a mailbox, and provides setup/toggle callbacks.
 *
 * Modelled on `useSyncTrigger` from plugin-inbox.
 */
export const useCrmRoutine = ({
  db,
  mailbox,
}: {
  db: Database.Database | undefined;
  mailbox: Mailbox.Mailbox;
}): {
  /** True when a complete CRM routine+trigger pair exists for this mailbox. */
  configured: boolean;
  routine: Routine.Routine | undefined;
  trigger: Trigger.Trigger | undefined;
  enabled: boolean | undefined;
  /** True while the one-click setup operation is in flight. */
  pending: boolean;
  /** Invoke the SetupMailboxCrm operation to create a fresh routine+trigger. */
  handleSetup: () => Promise<void>;
  /** Toggle the trigger's enabled flag. */
  handleToggle: () => void;
} => {
  const { invokePromise } = useOperationInvoker();
  const [pending, setPending] = useState(false);

  const triggers = useQuery(db, Query.select(Filter.type(Trigger.Trigger)).debugLabel('plugin-crm.useCrmRoutine'));

  const mailboxFeedUri = useMemo(() => mailbox.feed.uri, [mailbox.feed]);

  const crmTrigger = useMemo(
    () => triggers.find((trigger) => isCrmTrigger(trigger, mailboxFeedUri)),
    [triggers, mailboxFeedUri],
  );

  const crmRoutine = useMemo((): Routine.Routine | undefined => {
    // trigger.input is Record<string, any> | undefined; prompt is a hydrated Ref<Routine>.
    return crmTrigger?.input?.prompt?.target;
  }, [crmTrigger]);

  const configured = Boolean(crmTrigger && crmRoutine);

  const [enabled, setEnabled] = useObject(crmTrigger, 'enabled');

  const handleSetup = useCallback(async () => {
    setPending(true);
    try {
      await invokePromise(CrmOperation.SetupMailboxCrm, { mailboxUri: Obj.getURI(mailbox) }, { spaceId: db?.spaceId });
    } finally {
      setPending(false);
    }
  }, [db, mailbox, invokePromise]);

  const handleToggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, [setEnabled]);

  return {
    configured,
    routine: crmRoutine,
    trigger: crmTrigger,
    enabled,
    pending,
    handleSetup,
    handleToggle,
  };
};
