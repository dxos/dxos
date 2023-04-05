//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { useIdentity } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';

import { useAppRouter } from '../../hooks';

export const StackSection: FC<{ section: DocumentStack.Section }> = ({ section }) => {
  const identity = useIdentity();
  const { space } = useAppRouter();
  const object = section.object;

  return (
    <Composer
      identity={identity}
      space={space}
      text={object.content}
      slots={{
        editor: {
          spellCheck: false // TODO(burdon): Config.
        }
      }}
    />
  );
};
