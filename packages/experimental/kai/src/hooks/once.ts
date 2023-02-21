//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Move to util?

export const once = (storage: any) => (operationKey: string, fn: Function) => async () => {
  const key = `@dxos/once:${operationKey}`;
  const flag = key in storage;
  if (flag) {
    return storage[key];
  }

  storage[key] = undefined;
  storage[key] = (await fn()) ?? new Date();
};

export const oncePerProfile = once(localStorage);
export const oncePerSession = once(sessionStorage);
export const oncePerWindow = once({});
