//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ${name}Props = ThemedClassName<{}>;

export const ${name} = ({ classNames }: ${name}Props) => {
  return <div className={mx(classNames)}>${name}</div>;
};
