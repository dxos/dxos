//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/client/echo';
import { createAttendableAttributes } from '@dxos/react-ui-attention';

import { Grid, type GridRootProps } from './Grid';

const SheetArticle = ({ sheet }: GridRootProps) => {
  // TODO(burdon): Fix.
  const qualifiedSubjectId = fullyQualifiedId(sheet);
  const attendableAttrs = createAttendableAttributes(qualifiedSubjectId);

  return (
    <div role='none' className='group/attention flex flex-col row-span-2 is-full overflow-hidden' {...attendableAttrs}>
      <Grid.Root sheet={sheet}>
        <Grid.Main />
      </Grid.Root>
    </div>
  );
};

export default SheetArticle;
