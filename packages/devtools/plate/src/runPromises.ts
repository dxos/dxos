//
// Copyright 2022 DXOS.org
//

export const runPromises = ({
  before,
  after
}: {
  before: (p: Promise<any>, i: string) => any;
  after: (p: Promise<any>, i: string) => any;
}) => ({
  inSequence: async <T>(promises: Promise<T>[]): Promise<T[]> => {
    const results: any[] = [];
    for (const index in promises) {
      const promise = promises[index];
      before?.(promise, index);
      results.push(await promise);
      after?.(promise, index);
    }
    return results;
  },
  inParallel: async <T>(promises: Promise<T>[]): Promise<T[]> =>
    Promise.all(
      promises.map(async (p, i) => {
        before?.(p, i.toString());
        const r = await p;
        after?.(p, i.toString());
        return r;
      })
    )
});
