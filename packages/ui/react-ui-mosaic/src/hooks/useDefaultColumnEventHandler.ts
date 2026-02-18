//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';

import { type GetId, type MosaicEventHandler } from '../components';

import { useEventHandlerAdapter } from './useEventHandlerAdapter';

/**
 * Minimal model shape needed to build the default column handler.
 */
export type DefaultColumnEventHandlerModel<TColumn = unknown> = {
  getId: GetId<TColumn>;
  isColumn: (obj: unknown) => obj is TColumn;
};

/**
 * Returns the default column drag/drop handler (no persistence).
 * Use this when no custom eventHandler is passed to Board.Content.
 */
export const useDefaultColumnEventHandler = <TColumn extends Obj.Unknown = Obj.Unknown>(
  id: string,
  model: DefaultColumnEventHandlerModel<TColumn>,
  items: TColumn[],
): MosaicEventHandler<TColumn> =>
  useEventHandlerAdapter<TColumn, TColumn>({
    id,
    items,
    getId: model.getId as GetId<TColumn>,
    get: (data) => data,
    make: (object) => object,
    canDrop: ({ source }) => model.isColumn(source.data),
  });
