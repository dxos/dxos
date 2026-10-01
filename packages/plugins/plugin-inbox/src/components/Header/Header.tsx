//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Next, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Root
//

type HeaderRootProps = ThemedClassName<
  PropsWithChildren<{
    'data-testid'?: string;
  }>
>;

/**
 * Borderless-Card chrome for an object-article header: a bottom-ruled `Card.Root` + `Card.Body` whose
 * children are shared `Row.*` primitives. Used by the Event and Message article headers so both align to
 * one header structure.
 */
const HeaderRoot = ({ classNames, children, ...props }: HeaderRootProps) => (
  <Next.Card.Root border={false} classNames={mx('p-1 border-b border-subdued-separator', classNames)} {...props}>
    <Next.Card.Body>{children}</Next.Card.Body>
  </Next.Card.Root>
);

HeaderRoot.displayName = 'Header.Root';

//
// Header
//

export const Header = {
  Root: HeaderRoot,
};

export type { HeaderRootProps };
