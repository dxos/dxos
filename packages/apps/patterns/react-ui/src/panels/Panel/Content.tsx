//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { mx } from '@dxos/react-components';

export type ContentProps = PropsWithChildren & {
  className?: string;
  padded?: boolean;
};

export const Content = (props: ContentProps) => {
  const { padded } = props;
  return (
    <div
      role='group'
      className={mx(padded && 'p-4 pbs-2', 'grow flex flex-col justify-between gap-y-4', props.className)}
    >
      {props.children}
    </div>
  );
};
