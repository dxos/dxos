//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { descriptionText, mx } from '@dxos/react-ui-theme';

export type PanelHeadingProps = PropsWithChildren<{
  titleId: string;
  title: string;
  titleSrOnly?: boolean;
  corner?: ReactNode;
}>;

export const Heading = forwardRef<HTMLDivElement, PanelHeadingProps>(
  ({ titleId, title, titleSrOnly, children, corner }, forwardedRef) => (
    <div role='none' className='pbe-2 relative' ref={forwardedRef}>
      {corner}
      <h1
        {...(!titleSrOnly && { id: titleId })}
        className={mx(descriptionText, 'text-center mlb-2', titleSrOnly && 'invisible')}
      >
        {title}
      </h1>
      {titleSrOnly && <span id={titleId}>{title}</span>}
      {children}
    </div>
  ),
);
