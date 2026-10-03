//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { Block, Card, Focus, Menu, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { osTranslations } from '@dxos/ui-theme';

import { Row } from '../Row/index.ts';

//
// Root
//

type CardTileRootProps = ThemedClassName<
  PropsWithChildren<
    Pick<MosaicTileProps<unknown>, 'data' | 'location' | 'current'> & {
      'id': string;
      'onCurrentChange': () => void;
      'onClick'?: (event: MouseEvent) => void;
      'data-testid'?: string;
    }
  >
>;

/**
 * Shared mosaic tile shell: `Mosaic.Tile` → `Focus.Item` → `Card.Root`.
 * Callers supply the inner `Card.Header`/`Card.Body` (typically via {@link CardTileHeader} + rows).
 * Activation is committed by the caller's `onCurrentChange` (Mosaic `current`/selection), so click/Enter light the tile up.
 */
const CardTileRoot = forwardRef<HTMLDivElement, CardTileRootProps>(
  (
    { id, data, location, current, onCurrentChange, onClick, classNames, children, 'data-testid': testId },
    forwardedRef,
  ) => (
    <Mosaic.Tile
      asChild
      id={id}
      data={data}
      location={location}
      classNames={classNames ?? 'dx-hover dx-current dx-selected p-1 rounded-md border border-separator-subtle'}
    >
      <Focus.Item asChild current={current} onCurrentChange={onCurrentChange}>
        <Card.Root border={false} onClick={onClick} ref={forwardedRef} data-testid={testId}>
          {children}
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  ),
);

CardTileRoot.displayName = 'CardTile.Root';

//
// Header
//

/** A single `Card.Menu` dropdown item. */
export type CardTileMenuItem = {
  label: string;
  icon?: string;
  onClick: () => void;
};

type CardTileHeaderProps = {
  /** Header title content (rendered in a flex row). */
  title: ReactNode;
  /** Whether the tile is starred. `Row.Star` renders the button only when `onToggleStar` is set. */
  starred?: boolean;
  /** Render the trailing `Card.Menu` action slot. */
  menu?: boolean;
  /** Items for the `Card.Menu` dropdown (the trigger is disabled when empty). */
  menuItems?: CardTileMenuItem[];
  onToggleStar?: () => void;
};

/**
 * Tile header row: leading `Row.Star` · title · optional `Card.Menu`. Shared by message/conversation
 * tiles (with menu) and event tiles (star + title only).
 */
const CardTileHeader = ({ title, starred, menu = false, menuItems, onToggleStar }: CardTileHeaderProps) => {
  const { t } = useTranslation(osTranslations);
  return (
    <Card.Header>
      <Block>
        <Row.Star starred={starred} onToggle={onToggleStar} />
      </Block>
      <Card.Title classNames='flex items-center gap-3'>{title}</Card.Title>
      {menu && (
        <Card.Menu label={t('toolbar-menu.label')}>
          {menuItems?.map((item) => (
            <Menu.Item
              key={item.label}
              item={{ value: item.label, label: item.label, icon: item.icon }}
              onClick={item.onClick}
            />
          ))}
        </Card.Menu>
      )}
    </Card.Header>
  );
};

CardTileHeader.displayName = 'CardTile.Header';

//
// Tile
//

export const CardTile = {
  Root: CardTileRoot,
  Header: CardTileHeader,
};

export type { CardTileHeaderProps, CardTileRootProps };
