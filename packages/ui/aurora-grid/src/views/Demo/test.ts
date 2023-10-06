//
// Copyright 2023 DXOS.org
//

import { MosaicDataItem, MosaicTileComponent } from '../../mosaic';

// TODO(burdon): Factor out.
export type TestComponentProps<TData extends MosaicDataItem> = {
  id: string;
  types?: string[];
  debug?: boolean;
  Component?: MosaicTileComponent<TData>;
};
