//
// Copyright 2023 DXOS.org
//

import { IconProps } from '@phosphor-icons/react';
import { FC } from 'react';

// TODO(wittjosiah): Remove. This is a workaround for the fact that graph plugin subtrees are currently isolated.
export type SpaceProvides = {
  space: {
    types?: {
      id: string;
      testId: string;
      label: string | [string, { ns: string }];
      icon: FC<IconProps>;
      // TODO(wittjosiah): Type?
      // TODO(burdon): Optional callback to create and initialize object.
      Type: any;
    }[];
  };
};
