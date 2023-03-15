//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { useEffect } from 'react';

import { UnsubscribeCallback } from '@dxos/async';
import { Space } from '@dxos/client';
import { log } from '@dxos/log';
import { YText, YXmlFragment } from '@dxos/text-model';

// TODO(wittjosiah): Replace with gravity agent?
type DataGenerator<T = { space: Space }> = (options: T) => UnsubscribeCallback;

type LoremOptions = {
  text?: YText | YXmlFragment;
  period?: number;
};

export const loremGenerator: DataGenerator<LoremOptions> = ({ text, period = 1000 }) => {
  if (!text || text instanceof YXmlFragment) {
    return () => {};
  }

  const interval = setInterval(() => {
    const lorem = faker.lorem.sentence() + '\n';
    const indices: number[] = [...text.toString().matchAll(/\./gi)].map((a) => a.index! + 2);
    const startPosition = indices[Math.floor(Math.random() * indices.length) - 1] ?? 0;
    log('inserting', {
      text,
      indices,
      startPosition,
      lorem
    });
    text.insert(startPosition, lorem);
    log('inserted', { result: text.toString() });
  }, period);

  return () => clearInterval(interval);
};

export type UseDataGeneratorOptions<T> = {
  generator?: DataGenerator<T>;
  options: T;
};

/**
 *
 */
export const useDataGenerator = <T,>({ generator, options }: UseDataGeneratorOptions<T>) => {
  useEffect(() => {
    if (!generator) {
      return;
    }

    const unsubscribe = generator(options);

    return () => unsubscribe();
  }, [generator, options]);
};
