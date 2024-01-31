//
// Copyright 2024 DXOS.org
//

export const safeParseJson: {
  <T extends object>(data: string | undefined | null, defaultValue: T): T;
  <T extends object>(data: string | undefined | null): T | undefined;
} = <T extends object>(data: string | undefined | null, defaultValue?: T) => {
  if (data) {
    try {
      return JSON.parse(data);
    } catch (err) {}
  }
  return defaultValue;
};
