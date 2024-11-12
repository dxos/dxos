//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN, SpaceAction } from '../meta';

export const ShareSpaceButton = ({ space }: { space: Space }) => {
  const dispatch = useIntentDispatcher();

  return <ShareSpaceButtonImpl onClick={() => dispatch({ action: SpaceAction.SHARE, data: { space } })} />;
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
