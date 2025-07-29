//
// Copyright 2024 DXOS.org
//

export const safeParseInt = (value: string | undefined, defaultValue?: number) => {
  try {
    const n = parseInt(value ?? '');
    return isNaN(n) ? defaultValue : n;
  } catch (err) {
    return defaultValue;
  }
};

export const safeParseFloat = (str: string, defaultValue?: number): number | undefined => {
  try {
    return parseFloat(str);
  } catch {
    return defaultValue ?? 0;
  }
};

export const safeParseJson: {
  <T extends object>(data: string | undefined | null, defaultValue: T): T;
  <T extends object>(data: string | undefined | null): T | undefined;
} = <T extends object>(data: string | undefined | null, defaultValue?: T) => {
  if (data && data.length > 0) {
    try {
      return JSON.parse(data);
    } catch (err) {
      // no-op.
    }
  }
  return defaultValue;
};
