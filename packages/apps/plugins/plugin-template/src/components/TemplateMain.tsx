//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Main } from '@dxos/aurora';
import { baseSurface, mx } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/client';
import { SpaceProxy, TypedObject } from '@dxos/client/echo';

export const TemplateMain = ({ data: { space, object } }: { data: { space: SpaceProxy; object: TypedObject } }) => {
  return (
    // TODO(burdon): Boilerplate.
    <Main.Content classNames={mx('flex flex-col grow min-bs-[100vh] overflow-hidden', baseSurface)}>
      <pre className='m-4 p-2 ring'>
        <span>{space.key.truncate()}</span>/<span>{PublicKey.from(object.id).truncate()}</span>
      </pre>
    </Main.Content>
  );
};
