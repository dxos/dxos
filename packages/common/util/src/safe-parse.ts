//
// Copyright 2024 DXOS.org
//

export const safeParseInt: {
  (str: string | undefined, defaultValue: number): number;
  (str: string | undefined): number | undefined;
} = ((str: string | undefined, defaultValue?: number): number | undefined => {
  try {
    const value = parseInt(str ?? '');
    return isNaN(value) ? defaultValue : value;
  } catch {
    return defaultValue;
  }
}) as any;

export const safeParseFloat: {
  (str: string | undefined, defaultValue: number): number;
  (str: string | undefined): number | undefined;
} = ((str: string | undefined, defaultValue?: number): number | undefined => {
  try {
    const value = parseFloat(str ?? '');
    return isNaN(value) ? defaultValue : value;
  } catch {
    return defaultValue;
  }
}) as any;

export const safeParseJson: {
  <T extends object>(str: string | undefined | null, defaultValue: T): T;
  <T extends object>(str: string | undefined | null): T | undefined;
} = <T extends object = any>(str: string | undefined | null, defaultValue?: T): T | undefined => {
  if (str && str.length > 0) {
    try {
      return JSON.parse(str);
    } catch {}
  }

  return defaultValue;
};
