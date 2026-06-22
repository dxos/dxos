//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

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
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('settings.section.title')}>
            <Form.Row
              label={t('settings.recreate-exemplar.label')}
              description={t('settings.recreate-exemplar.description')}
            >
              <IconButton
                icon='ph--potted-plant--regular'
                iconOnly
                label={t('settings.recreate-exemplar.label')}
                disabled={busy}
                onClick={handleRecreate}
              />
            </Form.Row>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
