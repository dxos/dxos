//
// Copyright 2024 DXOS.org
//

export function safeParseInt(str: string | undefined, defaultValue: number): number;
export function safeParseInt(str: string | undefined): number | undefined;
export function safeParseInt(str: string | undefined, defaultValue?: number): number | undefined {
  try {
    const value = parseInt(str ?? '');
    return isNaN(value) ? defaultValue : value;
  } catch {
    return defaultValue;
  }
}

export function safeParseFloat(str: string | undefined, defaultValue: number): number;
export function safeParseFloat(str: string | undefined): number | undefined;
export function safeParseFloat(str: string | undefined, defaultValue?: number): number | undefined {
  try {
    const value = parseFloat(str ?? '');
    return isNaN(value) ? defaultValue : value;
  } catch {
    return defaultValue;
  }
}

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
