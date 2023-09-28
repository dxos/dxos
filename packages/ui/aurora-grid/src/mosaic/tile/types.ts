//
// Copyright 2023 DXOS.org
//

export type TileVariant = 'stack' | 'card' | 'treeitem';

export type TileSharedProps = {
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
