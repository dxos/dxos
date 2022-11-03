//
// Copyright 2022 DXOS.org
//

type Part<T> = (...args: any) => Promise<any>;

/**
 * Async reducer iteratively applies functions to the given array of elements.
 */
export const asyncChain =
  <T>(chain: Part<T>[]) =>
  async (elements: Promise<T[]>) => {
    let result = await Promise.resolve(elements);
    for (const part of chain) {
      result = await Promise.all(result.map(async (element) => await part(element)));
    }

    return result;
  };
