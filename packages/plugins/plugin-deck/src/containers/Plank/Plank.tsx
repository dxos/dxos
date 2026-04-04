//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { PlankProvider, type PlankContextValue } from './PlankContext';
import { PlankComponent } from './PlankComponent';
import { PlankContent } from './PlankContent';
import { PlankHeading } from './PlankHeading';
import { PlankControls } from './PlankControls';

type PlankRootProps = PropsWithChildren<PlankContextValue>;

/**
 * Headless root that provides plank context.
 */
const PlankRoot = ({ children, ...context }: PlankRootProps) => {
  return <PlankProvider {...context}>{children}</PlankProvider>;
};

/**
 * Radix-style composite Plank component.
 */
export const Plank = {
  Root: PlankRoot,
  Content: PlankContent,
  Component: PlankComponent,
  Heading: PlankHeading,
  Controls: PlankControls,
};

export type { PlankRootProps };
export type { PlankComponentProps } from './PlankComponent';
export type { PlankContentProps } from './PlankContent';
export type { PlankContextValue } from './PlankContext';
