//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

export type HeadingProps = PropsWithChildren<{
  titleId: string;
  title: string;
  corner?: ReactNode;
  ssrOnly?: boolean;
}>;

/**
 * @deprecated use Card.
 */
export const Heading = forwardRef<HTMLDivElement, HeadingProps>(
  ({ children, titleId, title, corner, ssrOnly }, forwardedRef) => {
    return (
      <div role='none' className='pb-2 relative' ref={forwardedRef}>
        {corner}
        <h1
          {...(!ssrOnly && { id: titleId })}
          className={mx('text-description', 'text-center my-2', ssrOnly && 'invisible')}
        >
          {title}
        </h1>
        {ssrOnly && <span id={titleId}>{title}</span>}
        {children}
      </div>
    );
  },
);
