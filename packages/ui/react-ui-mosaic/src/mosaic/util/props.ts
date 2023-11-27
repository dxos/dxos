//
// Copyright 2023 DXOS.org
//

import { MosaicOperations } from '../Container';
import { type MosaicTileComponentProps, type MosaicTileProps } from '../Tile';

export const isTileProps = (props: Record<string, unknown>): props is MosaicTileProps =>
  typeof props.path === 'string' && typeof props.item === 'object' && props.item
    ? 'id' in props.item && typeof props.item.id === 'string'
    : false;

export const isTileComponentProps = (props: Record<string, unknown>): props is MosaicTileComponentProps =>
  isTileProps(props) && typeof props.operation === 'string' && MosaicOperations.includes(props.operation);
