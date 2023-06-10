//
// Copyright 2023 DXOS.org
//

import { TFunction } from '@dxos/aurora';
import { Space } from '@dxos/client';

export const getSpaceDisplayName = (t: TFunction, space: Space, disabled?: boolean) => {
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? t('loading space title')
    : t('untitled space title');
};
