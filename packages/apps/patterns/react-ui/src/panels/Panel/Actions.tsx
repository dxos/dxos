//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { mx } from '@dxos/react-components';

export type ActionsProps = PropsWithChildren & {
  className?: string;
};

export const Actions = (props: ActionsProps) => {
  return (
    <div role='group' className={mx('flex flex-col gap-y-2', props.className)}>
      {props.children}
    </div>
  );
};
