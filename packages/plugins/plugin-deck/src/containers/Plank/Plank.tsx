//
// Copyright 2024 DXOS.org
//

import { PlankControls } from '../Deck/PlankControls';
import { PlankComponent, PlankComponentProps } from './PlankComponent';
import { PlankContent, PlankContentProps } from './PlankContent';
import { PlankHeading } from './PlankHeading';
import { PlankRoot, PlankRootProps } from './PlankRoot';

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

export type { PlankRootProps, PlankComponentProps, PlankContentProps };
