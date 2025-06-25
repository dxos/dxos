//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type AlertProps = ThemedClassName<
  PropsWithChildren<{
    title?: string;
  }>
>;

// TODO(burdon): Severity tag to color background?
export const Alert = ({ classNames, title, children }: AlertProps) => {
  const { tx } = useThemeContext();
  return (
    <div role='alert' className={tx('alert.root', 'alert', {}, classNames)}>
      {title && <h2 className={tx('alert.title', 'title')}>{title}</h2>}
      {children}
    </div>
  );
};
