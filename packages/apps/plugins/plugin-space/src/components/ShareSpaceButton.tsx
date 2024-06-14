//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type PublicKey, useClient } from '@dxos/react-client';
import { Button, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const ShareSpaceButton = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const client = useClient();

  return <ShareSpaceButtonImpl onClick={() => client.shell.shareSpace({ spaceKey })} />;
};

// TODO(wittjosiah): Better way to name pure/impure components?
export const ShareSpaceButtonImpl = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <Button data-testid='spacePlugin.shareSpaceButton' onClick={onClick} classNames='mli-1'>
      {t('share space label')}
    </Button>
  );
};
