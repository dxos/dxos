//
// Copyright 2022 DXOS.org
//

export const data = Symbol.for('dxos.echo.data');

/**
 * Reference to an object in a foreign database.
 */
export type ForeignKey = {
  /**
   * Name of the foreign database/system.
   * g. `github.com`.
   */
  source?: string;

  /**
   * Id within the foreign database.
   */
  id?: string;
};

/**
 * Echo object metadata.
 */
export type ObjectMeta = {
  /**
   * Foreign keys.
   */
  keys: ForeignKey[];
};
