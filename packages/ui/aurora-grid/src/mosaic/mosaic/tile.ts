//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Make generic.
type TileVariant = 'stack' | 'card' | 'treeitem';

export type TileProps = {
  // Primary props
  id: string;
  index: string;
  variant: TileVariant;
  sortable?: boolean;

  migrationClass?: string;
  acceptMigrationClass?: Set<string>;
  copyClass?: Set<string>;
  acceptCopyClass?: string;

  // Secondary props
  isPreview?: boolean;
};
