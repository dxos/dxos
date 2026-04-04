//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { PlankProvider, type PlankContextValue } from './PlankContext';
import { PlankComponent } from './PlankComponent';
import { PlankContainer } from './PlankContainer';
import { PlankHeading } from './PlankHeading';
import { PlankControls } from './PlankControls';

//
// PlankRoot
//

type PlankRootProps = PropsWithChildren<PlankContextValue>;

/**
 * Headless root that provides plank context.
 * Consumers (e.g., DeckMain) call hooks and pass values in as props.
 * In stories/tests, values can be provided directly without plugin infrastructure.
 */
const PlankRoot = ({ children, ...context }: PlankRootProps) => {
  return <PlankProvider {...context}>{children}</PlankProvider>;
};

export { PlankRoot };
export type { PlankRootProps };

/**
 * Radix-style composite Plank component.
 */
export const Plank = {
  Root: PlankRoot,
  Container: PlankContainer,
  Article: PlankComponent,
  Heading: PlankHeading,
  Controls: PlankControls,
};
