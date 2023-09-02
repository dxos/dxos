export const forEachAsync = <T>(items: T[], fn: (item: T, idx: number) => Promise<void>) =>
  Promise.all(items.map(fn));