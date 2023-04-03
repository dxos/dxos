//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { mx } from '@dxos/react-components';

export type ContentProps = PropsWithChildren & {
  className?: string;
};

export const Content = (props: ContentProps) => {
  return (
    <div role='group' className={mx('m-4 text-neutral-750 dark:text-neutral-250', props.className)}>
      {props.children}
    </div>
  );
};
