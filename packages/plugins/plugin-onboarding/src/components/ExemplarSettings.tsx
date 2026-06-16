//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { EXEMPLAR_SPACE_TAG } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { useClient } from '@dxos/react-client';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import EXEMPLAR_SPACE_JSON from '../content/exemplar-space.dx.json?raw';
import { meta } from '../meta';

const EXEMPLAR_SPACE_ARCHIVE_FILENAME = 'exemplar-space.dx.json';

export const ExemplarSettings = () => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const [busy, setBusy] = useState(false);

  const handleRecreate = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const archive: SpaceArchive = {
        filename: EXEMPLAR_SPACE_ARCHIVE_FILENAME,
        contents: new TextEncoder().encode(EXEMPLAR_SPACE_JSON),
        format: SpaceArchive.Format.JSON,
      };
      const space = await client.spaces.import(archive, { tags: [EXEMPLAR_SPACE_TAG] });
      await space.waitUntilReady();
      log.info('exemplar space imported', { id: space.id });
    } catch (err) {
      log.catch(err);
    } finally {
      setBusy(false);
    }
  }, [busy, client]);

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
