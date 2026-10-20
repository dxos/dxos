//
// Copyright 2026 DXOS.org
//

/** Printed form of a value: strings verbatim, everything else as JSON the model can read back. */
export const formatPrinted = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
};
