//
// Copyright 2024 DXOS.org
//

export const mkIntentBuilder =
  <T>(pluginName: string) =>
  <K extends keyof T>(type: K, ...args: [T[K]] extends [undefined] ? [payload?: T[K]] : [payload: T[K]]) => {
    const payload = args.length > 0 ? args[0] : undefined;

    return {
      plugin: pluginName,
      action: type,
      data: payload,
    };
  };
