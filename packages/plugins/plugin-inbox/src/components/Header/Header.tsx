//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName, Card } from '@dxos/react-ui';
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
  <Card.Root border={false} fullWidth classNames={mx('p-1 border-b border-subdued-separator', classNames)} {...props}>
    <Card.Body>{children}</Card.Body>
  </Card.Root>
);

HeaderRoot.displayName = 'Header.Root';

//
// Header
//

export const Header = {
  Root: HeaderRoot,
};

export type { HeaderRootProps };
