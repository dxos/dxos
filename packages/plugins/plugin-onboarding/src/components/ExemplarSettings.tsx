//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { OnboardingOperation } from '../operations';

export const ExemplarSettings = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const [busy, setBusy] = useState(false);

  const handleRecreate = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await invokePromise(OnboardingOperation.ImportExemplarSpace, { force: true });
      log.info('exemplar space recreated');
    } catch (err) {
      log.catch(err);
    } finally {
      setBusy(false);
    }
  }, [busy, invokePromise]);

  return (
    <Settings.Viewport>
      <Settings.Section title={t('settings.section.title')}>
        <Settings.Item
          title={t('settings.recreate-exemplar.label')}
          description={t('settings.recreate-exemplar.description')}
        >
          <IconButton
            icon='ph--potted-plant--regular'
            iconOnly
            label={t('settings.recreate-exemplar.label')}
            disabled={busy}
            onClick={handleRecreate}
          />
        </Settings.Item>
      </Settings.Section>
    </Settings.Viewport>
  );
};
