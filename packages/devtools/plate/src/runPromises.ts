export const runPromises = ({
  before,
  after
}: {
  before: (p: Promise<any>, i: string) => any;
  after: (p: Promise<any>, i: string) => any;
}) => ({
  async inSequence<T>(promises: Promise<T>[]): Promise<T[]> {
    const results: any[] = [];
    for (const index in promises) {
      const promise = promises[index];
      before?.(promise, index);
      results.push(await promise);
      after?.(promise, index);
    }
    return results;
  },
  async inParallel<T>(promises: Promise<T>[]): Promise<T[]> {
    return Promise.all(
      promises.map(async (p, i) => {
        before?.(p, i.toString());
        const r = await p;
        after?.(p, i.toString());
        return r;
      })
    );
  }
});
