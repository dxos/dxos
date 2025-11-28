//
// Copyright 2024 DXOS.org
//

export function safeParseInt(value: string | undefined, defaultValue: number): number;
export function safeParseInt(value: string | undefined, defaultValue?: undefined): number | undefined;
export function safeParseInt(value: string | undefined, defaultValue?: number): number | undefined {
  try {
    const n = parseInt(value ?? '');
    return isNaN(n) ? defaultValue : n;
  } catch {
    return defaultValue;
  }
}

export function safeParseFloat(str: string | undefined, defaultValue: number): number;
export function safeParseFloat(str: string | undefined, defaultValue?: undefined): number | undefined;
export function safeParseFloat(str: string | undefined, defaultValue?: number): number | undefined {
  try {
    const n = parseFloat(str ?? '');
    return isNaN(n) ? defaultValue : n;
  } catch {
    return defaultValue;
  }
}

export const safeParseJson: {
  <T extends object>(data: string | undefined | null, defaultValue: T): T;
  <T extends object>(data: string | undefined | null): T | undefined;
} = <T extends object = any>(data: string | undefined | null, defaultValue?: T): T | undefined => {
  if (data && data.length > 0) {
    try {
      return JSON.parse(data);
    } catch {
      // no-op.
    }
  }

  return defaultValue;
};
