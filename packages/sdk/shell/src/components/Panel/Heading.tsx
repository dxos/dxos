//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, type PropsWithChildren, type ReactNode } from 'react';

import { descriptionText, mx } from '@dxos/react-ui-theme';

import { type PanelVariant } from '../../types';

export type PanelHeadingProps = PropsWithChildren<{
  titleId: string;
  title: string;
  titleSrOnly?: boolean;
  corner?: ReactNode;
  variant?: PanelVariant;
}>;

export const Heading = forwardRef<HTMLDivElement, PanelHeadingProps>(
  ({ titleId, title, titleSrOnly: propsTitleSrOnly, children, corner, variant }, forwardedRef) => {
    const titleSrOnly = propsTitleSrOnly || variant === 'main';
    return (
      <div role='none' className='pbe-2 relative' ref={forwardedRef}>
        {variant !== 'main' && corner}
        <h1 id={titleId} className={mx(descriptionText, 'mlb-2 text-center', titleSrOnly && 'sr-only')}>
          {title}
        </h1>
        {children}
      </div>
    );
  },
);
