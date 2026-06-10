//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Mailbox } from '@dxos/plugin-inbox';
import { Button, Input, Panel, useTranslation } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';

import { useCrmRoutine } from '../../hooks';
import { meta } from '../../meta';

export type CrmMailboxCompanionProps = {
  companionTo: Mailbox.Mailbox;
};

/**
 * Companion panel for a Mailbox that allows configuring a CRM routine.
 *
 * - "Not configured" state: shows a description and a one-click "Set up CRM" button.
 * - "Configured" state: shows an enable/disable toggle and an inline routine
 *   instructions editor (via ObjectProperties on the Routine).
 */
export const CrmMailboxCompanion = ({ companionTo }: CrmMailboxCompanionProps) => {
  const { t } = useTranslation(meta.id);
  const db = useMemo(() => Obj.getDatabase(companionTo), [companionTo]);

  const { configured, routine, enabled, pending, handleSetup, handleToggle } = useCrmRoutine({
    db,
    mailbox: companionTo,
  });

  return (
    <Panel.Root>
      <Panel.Content classNames='flex flex-col gap-4 p-4'>
        {configured && routine ? (
          <>
            {/* Enable / disable toggle */}
            <Input.Root>
              <div className='flex flex-row items-center justify-between'>
                <Input.Label>{t('crm-routine.enabled.label')}</Input.Label>
                <Input.Switch checked={enabled ?? false} onCheckedChange={handleToggle} />
              </div>
            </Input.Root>

            {/* Inline routine instructions editor */}
            <div className='flex flex-col gap-1'>
              <span className='text-sm font-medium text-description'>{t('crm-routine.instructions.label')}</span>
              <ObjectProperties object={routine} />
            </div>
          </>
        ) : (
          <>
            <p className='text-sm text-description'>{t('crm-routine.setup.description')}</p>
            <Button disabled={pending || !db} onClick={() => void handleSetup()}>
              {pending ? t('crm-routine.setup-pending.label') : t('crm-routine.setup.label')}
            </Button>
          </>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

export default CrmMailboxCompanion;
