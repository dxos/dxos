//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, PropsWithChildren, type ReactNode, forwardRef } from 'react';

import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import * as Card from '@dxos/react-ui/Card';
import * as Focus from '@dxos/react-ui/Focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import type * as Util from '@dxos/react-ui/Util';
import { osTranslations } from '@dxos/ui-theme';

import { Row } from '../Row/index.ts';

//
// Root
//

type CardTileRootProps = Util.ThemedClassName<
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
 * Shared mosaic tile shell: `Mosaic.Tile` → `Focus.Item` → `Card.Root`. The card is a `grid` card, so every
 * header and row puts its leading cell (star, unread mark, avatar) in the start rail and its text on one
 * content edge.
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
        <Card.Root grid border={false} onClick={onClick} ref={forwardedRef} data-testid={testId}>
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
  /** Start-rail content in place of the star (e.g. an unread mark). */
  leading?: ReactNode;
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
const CardTileHeader = ({ title, leading, starred, menu = false, menuItems, onToggleStar }: CardTileHeaderProps) => {
  const { t } = Hooks.useTranslation(osTranslations);
  return (
    <Card.Header>
      <Layout.Block>{leading ?? <Row.Star starred={starred} onToggle={onToggleStar} />}</Layout.Block>
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
