//
// Copyright 2023 DXOS.org
//
import React from 'react';
import { useOutletContext, useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { observer } from '@dxos/react-client';
import { Input, useTranslation } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { ComposerDocument } from '../proto';

export const DocumentPage = observer(() => {
  const { t } = useTranslation('composer');
  const { space } = useOutletContext<{ space?: Space }>();
  const { docKey } = useParams();
  const document = space && docKey ? (space.db.getObjectById(docKey) as ComposerDocument) : undefined;
  return (
    <div role='none' className='pli-14 plb-11'>
      {document ? (
        <div role='none' className='mli-auto pli-6 pbs-3 max-is-[50rem] min-bs-screen border border-neutral-500/20'>
          <Input
            key={document.id}
            variant='subdued'
            label={t('document title label')}
            labelVisuallyHidden
            placeholder={t('untitled document title')}
            value={document.title ?? ''}
            onChange={({ target: { value } }) => (document.title = value)}
            size='lg'
          />
          <Composer
            document={document.content}
            slots={{
              root: {
                role: 'none',
                className: 'mbs-4'
              },
              editor: {
                className: 'pbe-20'
              }
            }}
          />
        </div>
      ) : (
        <p role='alert' className='p-8 text-center'>
          {t('loading document message')}
        </p>
      )}
    </div>
  );
});
