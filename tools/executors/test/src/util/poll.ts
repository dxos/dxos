//
// Copyright 2023 DXOS.org
//

export const poll = async <T>(fn: () => Promise<T>, fnCondition: (result: T) => boolean, ms = 1000) => {
  let result = await fn();
  while (!result || fnCondition(result)) {
    await wait(ms);
    result = await fn();
  }
  return result;
};

const wait = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));
