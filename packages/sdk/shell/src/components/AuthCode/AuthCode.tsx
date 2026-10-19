//
// Copyright 2023 DXOS.org
//
//

import React, { type ComponentPropsWithoutRef, type PropsWithChildren, useRef } from 'react';

import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

export type AuthCodeProps = Util.ThemedClassName<ComponentPropsWithoutRef<'span'>> & {
  code?: string;
  large?: boolean;
};

export const AuthCode = (props: PropsWithChildren<AuthCodeProps>) => {
  const { code, large, classNames } = props;
  const l = code?.length ?? 0;
  const left = code?.slice(0, l / 2);
  const right = code?.slice(l / 2);
  const codeRef = useRef<HTMLSpanElement | null>(null);
  const handleClick = () => {
    if (codeRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(codeRef.current);
      selection?.addRange(range);
    }
    void navigator.clipboard.writeText(code ?? '');
  };
  return (
    <span
      className={mx(large ? 'text-6xl' : 'text-2xl', 'font-mono px-2.5 rounded-sm cursor-pointer', classNames)}
      onClick={handleClick}
      ref={codeRef}
    >
      <span className='me-[0.4em]'>{left}</span>
      <span>{right}</span>
    </span>
  );
};
