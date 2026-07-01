//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { type Ibkr, IbkrOperation } from '../../types';

export type PortfolioImportActionProps = {
  /** The Portfolio whose space owns the report feed the imported report is appended to. */
  subject: Ibkr.Portfolio;
};

/**
 * Toolbar action that imports a raw Flex report XML from a local file, appending it to the report
 * feed via {@link IbkrOperation.ImportPortfolioReport}. Unlike sync it never calls IBKR, so it works
 * without a connection and is useful for backfilling reports downloaded from the Flex web UI. The
 * native file input is hidden (there is no design-system file picker); the visible trigger is an
 * {@link IconButton}.
 */
export const PortfolioImportAction = ({ subject }: PortfolioImportActionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(subject);
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const xml = await file.text();
        const { error } = await invokePromise(IbkrOperation.ImportPortfolioReport, { xml }, { spaceId: db?.spaceId });
        if (error) {
          log.warn('IBKR report import failed', { error });
        }
      } finally {
        setImporting(false);
      }
    },
    [invokePromise, db],
  );

  return (
    <>
      <IconButton
        disabled={importing}
        variant='ghost'
        iconClassNames={importing ? 'animate-spin' : undefined}
        icon={importing ? 'ph--spinner-gap--regular' : 'ph--upload-simple--regular'}
        label={importing ? t('importing.label') : t('import.label')}
        onClick={() => inputRef.current?.click()}
      />
      <input
        ref={inputRef}
        type='file'
        accept='.xml,text/xml,application/xml'
        className='sr-only'
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImport(file);
          }
          // Reset so selecting the same file again re-triggers onChange.
          event.target.value = '';
        }}
      />
    </>
  );
};
