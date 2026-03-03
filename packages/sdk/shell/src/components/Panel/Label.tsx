//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

export type LabelProps = PropsWithChildren<{}>;

export const Label = (props: LabelProps) => {
  const { children } = props;
  return <span className={mx('text-description', 'text-center mx-6 whitespace-normal')}>{children}</span>;
};
