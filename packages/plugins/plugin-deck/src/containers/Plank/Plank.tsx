//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { PlankRoot, PlankProvider, type PlankContextValue } from './PlankRoot';
import { PlankComponent } from './PlankComponent';
import { PlankContent } from './PlankContent';
import { PlankHeading } from './PlankHeading';
import { PlankControls } from './PlankControls';

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
