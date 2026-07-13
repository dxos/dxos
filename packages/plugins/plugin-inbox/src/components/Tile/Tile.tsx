//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type ReactNode, forwardRef } from 'react';

import { Card, type ThemedClassName } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';

import { Row } from '../Row';

// Single source for the mosaic tile chrome shared by event/message/conversation tiles.
const TILE_CLASSNAMES = 'dx-hover dx-current dx-selected p-1 rounded-md border border-subdued-separator';

//
// Root
//

type TileRootProps = ThemedClassName<
  Pick<MosaicTileProps<unknown>, 'data' | 'location' | 'current'> & {
    id: string;
    onCurrentChange: () => void;
    onClick?: (event: MouseEvent) => void;
    children?: ReactNode;
    'data-testid'?: string;
  }
>;

/**
 * Shared mosaic tile shell: `Mosaic.Tile` → `Focus.Item` → `Card.Root`. Callers supply the inner
 * `Card.Header`/`Card.Body` (typically via {@link TileHeader} + rows). Activation is committed by the
 * caller's `onCurrentChange` (Mosaic `current`/selection), so click/Enter light the tile up.
 */
const TileRoot = forwardRef<HTMLDivElement, TileRootProps>(
  ({ id, data, location, current, onCurrentChange, onClick, classNames, children, 'data-testid': testId }, forwardedRef) => (
    <Mosaic.Tile asChild classNames={classNames ?? TILE_CLASSNAMES} id={id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={onCurrentChange}>
        <Card.Root fullWidth border={false} onClick={onClick} ref={forwardedRef} data-testid={testId}>
          {children}
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  ),
);

TileRoot.displayName = 'Tile.Root';

//
// Header
//

/** A single `Card.Menu` dropdown item. */
export type TileMenuItem = { label: string; onClick: () => void };

type TileHeaderProps = {
  /** Header title content (rendered in a flex row). */
  title: ReactNode;
  /** Whether the tile is starred. `Row.Star` renders the button only when `onToggleStar` is set. */
  starred?: boolean;
  onToggleStar?: () => void;
  /** Render the trailing `Card.Menu` action slot. */
  menu?: boolean;
  /** Items for the `Card.Menu` dropdown (the trigger is disabled when empty). */
  menuItems?: TileMenuItem[];
};

/**
 * Tile header row: leading `Row.Star` · title · optional `Card.Menu`. Shared by message/conversation
 * tiles (with menu) and event tiles (star + title only).
 */
const TileHeader = ({ title, starred, onToggleStar, menu = false, menuItems }: TileHeaderProps) => (
  <Card.Header>
    <Card.Block>
      <Row.Star starred={starred} onToggle={onToggleStar} />
    </Card.Block>
    <Card.Title classNames='flex items-center gap-3'>{title}</Card.Title>
    {menu && <Card.Menu items={menuItems} />}
  </Card.Header>
);

TileHeader.displayName = 'Tile.Header';

//
// Tile
//

export const Tile = {
  Root: TileRoot,
  Header: TileHeader,
};

export type { TileHeaderProps, TileRootProps };
