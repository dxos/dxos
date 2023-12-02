//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { useEffect } from 'react';
import { XmlElement, XmlText } from 'yjs';

import { type UnsubscribeCallback } from '@dxos/async';
import type { Space } from '@dxos/client/echo';
import { YText, type YXmlFragment } from '@dxos/text-model';

// TODO(wittjosiah): Replace with gravity agent?
type DataGenerator<T = { space: Space }> = (options: T) => UnsubscribeCallback;

type LoremOptions = {
  text?: YText | YXmlFragment;
  period?: number;
};

export const textGenerator: DataGenerator<LoremOptions> = ({ text, period = 1000 }) => {
  if (!text) {
    return () => {};
  }

  const interval = setInterval(() => {
    const lorem = faker.lorem.sentence() + '\n';
    if (text instanceof YText) {
      const indices: number[] = [...text.toString().matchAll(/\./gi)].map((a) => a.index! + 2);
      const startPosition = indices[Math.floor(Math.random() * indices.length) - 1] ?? 0;
      text.insert(startPosition, lorem);
    } else {
      const startPosition = Math.floor(Math.random() * text.toArray().length);
      const paragraph = new XmlElement('paragraph');
      paragraph.insert(0, [new XmlText(lorem)]);
      text.insert(startPosition, [paragraph] as any); // TODO(burdon): Type error.
    }
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
  }, [generator, ...Object.values(options ?? {})]);
};
