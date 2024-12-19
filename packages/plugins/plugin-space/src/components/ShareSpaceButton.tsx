//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction } from '../types';

export const ShareSpaceButton = ({ space }: { space: Space }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return <ShareSpaceButtonImpl onClick={() => dispatch(createIntent(SpaceAction.Share, { space }))} />;
};

// TODO(wittjosiah): Better way to name pure/impure components?
export const ShareSpaceButtonImpl = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <IconButton
      data-testid='spacePlugin.shareSpaceButton'
      icon='ph--users--regular'
      label={t('share space label')}
      onClick={onClick}
    />
  );
};
