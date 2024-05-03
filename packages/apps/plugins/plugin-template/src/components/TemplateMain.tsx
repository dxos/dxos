//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { PublicKey } from '@dxos/react-client';
import { type EchoReactiveObject, getSpace } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, topbarBlockPaddingStart, fixedInsetFlexLayout } from '@dxos/react-ui-theme';

export const TemplateMain: FC<{ object: EchoReactiveObject<any> }> = ({ object }) => {
  const space = getSpace(object);

  return (
    // TODO(burdon): Boilerplate.
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <pre className='m-4 p-2 ring'>
        <span>{space?.key.truncate()}</span>/<span>{PublicKey.from(object.id).truncate()}</span>
      </pre>
    </Main.Content>
  );
};
