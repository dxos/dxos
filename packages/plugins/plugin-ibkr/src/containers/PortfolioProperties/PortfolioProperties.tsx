//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Operation, Trigger } from '@dxos/compute';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { createDailySyncTrigger, findSyncOperation, findSyncTrigger } from '../../sync';
import { Ibkr } from '../../types';

export type PortfolioPropertiesProps = AppSurface.ObjectPropertiesProps<Ibkr.Portfolio>;

/**
 * Companion properties panel for the Interactive Brokers {@link Portfolio}, mirroring the Gmail
 * mailbox properties: a single toggle that creates the daily sync trigger on first enable and
 * enables/disables it thereafter. The user keeps a single trigger per space.
 */
export const PortfolioProperties = ({ subject }: PortfolioPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = useMemo(() => Obj.getDatabase(subject), [subject]);
  const [pending, setPending] = useState(false);

  const triggers = useQuery(db, Query.select(Filter.type(Trigger.Trigger)));
  const operations = useQuery(db, Query.select(Filter.type(Operation.PersistentOperation)));
  const syncTrigger = useMemo(() => findSyncTrigger(triggers, operations), [triggers, operations]);
  const [syncEnabled, setSyncEnabled] = useObject(syncTrigger, 'enabled');

  const handleToggleSync = useCallback(() => {
    if (!db) {
      return;
    }
    // First enable creates the trigger (reusing an orphaned operation if present); later toggles flip it.
    if (syncTrigger) {
      setSyncEnabled((enabled) => !enabled);
      return;
    }
    setPending(true);
    try {
      createDailySyncTrigger(db, findSyncOperation(operations));
    } finally {
      setPending(false);
    }
  }, [db, syncTrigger, operations, setSyncEnabled]);

  return (
    <Form.Section>
      <Input.Root>
        <Input.Label>{t('daily-sync.label')}</Input.Label>
        <Input.Switch checked={syncEnabled ?? false} disabled={pending} onCheckedChange={handleToggleSync} />
      </Input.Root>
    </Form.Section>
  );
};
