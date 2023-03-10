//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { useEffect } from 'react';

import { UnsubscribeCallback } from '@dxos/async';
import { Space } from '@dxos/client';
import { log } from '@dxos/log';
import { Doc, TextModel } from '@dxos/text-model';

// TODO(wittjosiah): Replace with gravity agent?
type DataGenerator<T = void> = (space: Space, options: T) => UnsubscribeCallback;

type LoremOptions = {
  period?: number;
  plainText?: boolean;
};

export const loremGenerator: DataGenerator<LoremOptions> = (space, { period = 1000, plainText }) => {
  const [document] = space.db.query((obj) => !!obj.content).objects;
  if (!document) {
    return () => {};
  }

  if (!(document.content.model instanceof TextModel)) {
    log.warn('Unexpected document content model', { id: document.id });
    return () => {};
  }

  const interval = setInterval(() => {
    const lorem = faker.lorem.sentence() + '\n';
    if (plainText) {
      const text = (document.content.doc as Doc).getText('md');
      const indices: number[] = [...text.toString().matchAll(/\./gi)].map((a) => a.index + 2);
      const startPosition = indices[Math.floor(Math.random() * indices.length) - 1] ?? 0;
      log.debug('inserting', {
        docid: document.id,
        plainText,
        indices,
        startPosition,
        lorem
      });
      text.insert(startPosition, lorem);
      log.debug('inserted', { result: document.content.doc.getText('md').toString() });
    }
    // else {
    //   document.content.model.insert(char, startPosition++);
    // }
  }, period);

  return () => clearInterval(interval);
};

export type UseDataGeneratorOptions<T> = {
  generator?: DataGenerator<T>;
  space?: Space;
  options: T;
};

/**
 *
 */
export const useDataGenerator = <T,>({ generator, space, options }: UseDataGeneratorOptions<T>) => {
  useEffect(() => {
    if (!space || !generator) {
      return;
    }

    const unsubscribe = generator(space, options);

    return () => unsubscribe();
  }, [generator, space, options]);
};
