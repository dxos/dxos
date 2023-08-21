//
// Copyright 2023 DXOS.org
//

import React, { HTMLProps, PropsWithChildren } from 'react';

export type AuthCodeProps = HTMLProps<HTMLDivElement> & {
  code?: string;
};

export const AuthCode = (props: PropsWithChildren<AuthCodeProps>) => {
  const { code, className } = props;
  const l = code?.length ?? 0;
  return (
    <div className={'text-2xl font-mono pli-2 flex gap-2 ' + (className ?? '')}>
      <span>{code?.slice(0, l / 2)}</span>
      <span>{code?.slice(l / 2)}</span>
    </div>
  );
};
