//
// Copyright 2025 DXOS.org
//

export const formatDuration = (duration: number): string => {
  return `${(duration / 1000).toFixed(2)}`;
};

/**
 * Extracts the UUID part from a DXN.
 * @param dxn The DXN to extract the UUID from.
 * @returns The UUID part of the DXN, or undefined if the DXN is undefined or invalid.
 */
export const getUuidFromDxn = (dxn: string | undefined): string | undefined => {
  if (!dxn) {
    return undefined;
  }

  const dxnParts = dxn.split(':');
  return dxnParts.at(-1);
};
