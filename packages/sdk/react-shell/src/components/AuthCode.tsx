//
// Copyright 2023 DXOS.org
//

import React, { HTMLProps, PropsWithChildren, ReactNode } from 'react';

export type AuthCodeProps = HTMLProps<HTMLDivElement> & {
  code?: string;
  large?: boolean;
  divider?: ReactNode;
};

export const AuthCode = (props: PropsWithChildren<AuthCodeProps>) => {
  const { code, className, divider, large } = props;
  const l = code?.length ?? 0;
  return (
    <div
      className={
        `${large ? 'text-6xl' : 'text-2xl'} font-mono pli-2 flex ${large ? 'gap-4' : 'gap-2'} ` + (className ?? '')
      }
    >
      <span>{code?.slice(0, l / 2)}</span>
      {divider}
      <span>{code?.slice(l / 2)}</span>
    </div>
  );
};
