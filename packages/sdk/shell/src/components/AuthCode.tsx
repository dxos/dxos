//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type AuthCodeProps = ThemedClassName<ComponentPropsWithoutRef<'span'>> & {
  code?: string;
  large?: boolean;
};

export const AuthCode = (props: PropsWithChildren<AuthCodeProps>) => {
  const { code, large, classNames } = props;
  const l = code?.length ?? 0;
  const left = code?.slice(0, l / 2);
  const right = code?.slice(l / 2);
  const handleCopy = () => {
    void navigator.clipboard.writeText(code ?? '');
  };
  return (
    <span
      className={mx(
        large ? 'text-6xl' : 'text-2xl',
        'font-mono pli-2.5 flex gap-1.5 rounded cursor-pointer',
        classNames,
      )}
      onClick={handleCopy}
    >
      <span>{left}</span>
      <span>{right}</span>
    </span>
  );
};
