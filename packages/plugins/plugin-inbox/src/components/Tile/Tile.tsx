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
  }
>;

/**
 * Shared mosaic tile shell: `Mosaic.Tile` → `Focus.Item` → `Card.Root`. Callers supply the inner
 * `Card.Header`/`Card.Body` (typically via {@link TileHeader} + rows). Activation is committed by the
 * caller's `onCurrentChange` (Mosaic `current`/selection), so click/Enter light the tile up.
 */
const TileRoot = forwardRef<HTMLDivElement, TileRootProps>(
  ({ id, data, location, current, onCurrentChange, onClick, classNames, children }, forwardedRef) => (
    <Mosaic.Tile asChild classNames={classNames ?? TILE_CLASSNAMES} id={id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={onCurrentChange}>
        <Card.Root fullWidth border={false} onClick={onClick} ref={forwardedRef}>
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

type TileHeaderProps = {
  /** Header title content (rendered in a flex row). */
  title: ReactNode;
  /** Whether the tile is starred. `Row.Star` renders the button only when `onToggleStar` is set. */
  starred?: boolean;
  onToggleStar?: () => void;
  /** Render the trailing `Card.Menu` action slot. */
  menu?: boolean;
};

/**
 * Tile header row: leading `Row.Star` · title · optional `Card.Menu`. Shared by message/conversation
 * tiles (with menu) and event tiles (star + title only).
 */
const TileHeader = ({ title, starred, onToggleStar, menu = false }: TileHeaderProps) => (
  <Card.Header>
    <Card.Block>
      <Row.Star starred={starred} onToggle={onToggleStar} />
    </Card.Block>
    <Card.Title classNames='flex items-center gap-3'>{title}</Card.Title>
    {menu && <Card.Menu />}
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

export type { TileRootProps, TileHeaderProps };
