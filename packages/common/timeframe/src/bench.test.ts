//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { isNotNullOrUndefined, numericalValues, range } from '@dxos/util';

import { Timeframe } from './timeframe';

type RandomTimeframeOpts = {
  keys: PublicKey[];
  base?: Timeframe;
  occupancy?: number;
  similarity?: number;
};

const createRandomTimeframe = ({ keys, base, similarity = 0.1, occupancy = 0.05 }: RandomTimeframeOpts) => {
  const frames = keys
    .map((key): [PublicKey, number] | undefined => {
      if (base && Math.random() < similarity) {
        const seq = base.get(key);
        return seq !== undefined ? [key, base.get(key)!] : undefined;
      }

      if (Math.random() < occupancy) {
        return undefined;
      }

      return [key, Math.floor(Math.random() * 10_000)];
    })
    .filter(isNotNullOrUndefined);
  return new Timeframe(frames);
};

describe('Bench', () => {
  const NUM_KEYS = 500;
  const NUM_ITERS = 100;

  const keys = range(NUM_KEYS).map(() => PublicKey.random());

  test.only('dependencies', async () => {
    const timeframe1 = createRandomTimeframe({ keys });
    const timeframe2 = createRandomTimeframe({ keys, base: timeframe1, similarity: 0.6 });

    console.log(
      await bench(() => {
        for (let i = 0; i < NUM_ITERS; i++) {
          Timeframe.dependencies(timeframe1, timeframe2);
        }
      }, NUM_ITERS),
    );
  });
});

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

    await new Promise((resolve) => setImmediate(resolve));
  }

  return numericalValues(runs, (x) => x);
};

/*

baseline {
  total: 10.049405800029636,
  count: 36,
  min: 0.27159708000719546,
  max: 0.40789625003933905,
  mean: 0.2791501611119343,
  median: 0.27534582998603585
}

unwrap map {
  total: 9.89743632942438,
  count: 275,
  min: 0.03528792001307011,
  max: 0.08000333003699779,
  mean: 0.0359906775615432,
  median: 0.03549625001847744
}

collocate maps {
  total: 9.782685480117792,
  count: 305,
  min: 0.03119667001068592,
  max: 0.0767849999666214,
  mean: 0.03207437862333702,
  median: 0.03168250001966953
}

*/
