//
// Copyright 2023 DXOS.org
//

import React, { HTMLProps, PropsWithChildren } from 'react';

export type AuthCodeProps = HTMLProps<HTMLSpanElement> & {
  code?: string;
  large?: boolean;
};
export const AuthCode = (props: PropsWithChildren<AuthCodeProps>) => {
  const { code, large, className } = props;
  const l = code?.length ?? 0;
  const left = code?.slice(0, l / 2);
  const right = code?.slice(l / 2);
  return (
    <span className={`${large ? 'text-6xl' : 'text-2xl'} font-mono pli-2.5 flex gap-1.5 rounded ${className ?? ''}`}>
      <span>{left}</span>
      <span>{right}</span>
    </span>
  );
};
