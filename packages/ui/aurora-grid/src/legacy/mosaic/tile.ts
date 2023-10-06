//
// Copyright 2023 DXOS.org
//

export type TileProps = {
  // Primary props
  id: string;
  index: string;
  variant: string;
  sortable?: boolean;

  // TODO(burdon): Comment.
  migrationClass?: string;
  acceptMigrationClass?: Set<string>;
  copyClass?: Set<string>;
  acceptCopyClass?: string;

  // Secondary props
  isPreview?: boolean;
};
