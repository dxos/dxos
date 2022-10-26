//
// Copyright 2022 DXOS.org
//

import { CaretLeft, ShareNetwork } from 'phosphor-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { Item } from '@dxos/client';
import { Composer, DOCUMENT_TYPE } from '@dxos/composer';
import { useParty, useSelection } from '@dxos/react-client';
import { PartySharingDialog } from '@dxos/react-toolkit';
import {
  Button,
  getSize,
  Heading,
  Loading,
  Main,
  useTranslation
} from '@dxos/react-uikit';
import type { TextModel } from '@dxos/text-model';
import { humanize } from '@dxos/util';

import { useSafeSpaceKey } from '../../hooks';

export const SpacePage = () => {
  const { t } = useTranslation('halo');
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex);
  const space = useParty(spaceKey);
  const [item] =
    useSelection<Item<TextModel>>(
      space?.select().filter({ type: DOCUMENT_TYPE })
    ) ?? [];
  const [showShare, setShowShare] = useState(false);

  if (!space) {
    return null;
  }

  return (
    <Main>
      <div role='none' className='flex gap-2 items-center'>
        <Button onClick={() => navigate('/spaces')} className='flex gap-1'>
          <CaretLeft className={getSize(5)} />
          {t('back label', { ns: 'uikit' })}
        </Button>
        <Heading>{humanize(space.key)}</Heading>
        <div role='none' className='flex-grow' />
        <Button onClick={() => setShowShare(true)} className='flex gap-1'>
          <ShareNetwork className={getSize(5)} />
          {t('share space label', { ns: 'uikit' })}
        </Button>
      </div>
      {item ? (
        <Composer item={item} />
      ) : (
        <Loading label={t('generic loading label')} size='md' />
      )}
      <PartySharingDialog
        open={showShare}
        partyKey={space.key}
        onClose={() => setShowShare(false)}
      />
    </Main>
  );
};
