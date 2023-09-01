import { describe, test } from "@dxos/test";
import { Timeframe } from "./timeframe";
import { PublicKey } from "@dxos/keys";
import { isNotNullOrUndefined, numericalValues, range } from "@dxos/util";

type RandomTimeframeOpts = {
  keys: PublicKey[]
  base?: Timeframe;
  occupancy?: number;
  similarity?: number;
}

const createRandomTimeframe = ({ keys, base, similarity = 0.1, occupancy = 0.05 }: RandomTimeframeOpts) => {
  const frames = keys.map((key): [PublicKey, number] | undefined => {
    if (base && Math.random() < similarity) {
      const seq = base.get(key);
      return seq !== undefined ? [key, base.get(key)!] : undefined
    }

    if (Math.random() < occupancy) {
      return undefined
    }

    return [key, Math.floor(Math.random() * 10_000)]
  }).filter(isNotNullOrUndefined);
  return new Timeframe(frames);
}

describe('Bench', () => {
  const NUM_KEYS = 500;
  const NUM_ITERS = 100;

  const keys = range(NUM_KEYS).map(() => PublicKey.random());

  test.only('dependencies', async () => {
    const timeframe1 = createRandomTimeframe({ keys });
    const timeframe2 = createRandomTimeframe({ keys, base: timeframe1, similarity: 0.6 });

    console.log(await bench(() => {
      for (let i = 0; i < NUM_ITERS; i++) {
        Timeframe.dependencies(timeframe1, timeframe2);
      }
    }, NUM_ITERS))
  })
})

const bench = async (fn: () => void, factor = 1) => {
  const runs: number[] = [];

  const benchBegin = performance.now();
  while (true) {
    const begin = performance.now();
    fn();
    const end = performance.now();
    const elapsed = end - begin;
    const totalElapsed = end - benchBegin;
    runs.push(elapsed / factor);

    if (totalElapsed > 1_000) {
      break;
    }

    await new Promise(resolve => setImmediate(resolve))
  }

  return numericalValues(runs, x => x);
}