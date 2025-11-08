//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type AnimatedBorderProps = ThemedClassName<PropsWithChildren>;

/**
 * AnimatedBorder using CSS Motion Path.
 */
export const AnimatedBorder = ({ children, classNames }: AnimatedBorderProps) => {
  return <div className={mx(classNames)}>{children}</div>;
};
