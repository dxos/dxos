/**
 * Checks if process NODE_ENV in 'development' mode
 */
//
// Copyright 2021 DXOS.org
//

export function inDev (): boolean {
  return process.env.NODE_ENV === 'development';
}
