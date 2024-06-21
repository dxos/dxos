//
// Copyright 2024 DXOS.org
//

import { yieldOrContinue } from 'main-thread-scheduling';
import { useEffect, useState } from 'react';

import { TextType } from '@braneframe/types';

// TODO(thure): Deprecate search-sync, move still-relevant utilities elsewhere (here, probably).
import { mapObjectToTextFields, queryStringToMatch } from './search-sync';

export const filterObjects = async <T extends Record<string, any>>(
  objects: T[],
  match?: RegExp,
): Promise<Map<T, string[][]>> => {
  const result = new Map<T, string[][]>();
  if (!match) {
    return result;
  }
  await Promise.all(
    objects
      .filter((object) => !(object instanceof TextType))
      .map(async (object) => {
        await yieldOrContinue('interactive');
        const fields = mapObjectToTextFields<T>(object);
        Object.entries(fields)
          .filter(([_, value]) => value.match(match))
          .forEach(([key, value]) => {
            if (!result.has(object)) {
              result.set(object, []);
            }
            result.set(object, [...result.get(object)!, [key, value]]);
          });
      }),
  );
  return result;
};

export const useSearchResults = <T extends Record<string, any>>(
  queryString?: string,
  objects?: T[],
  delay: number = 400,
): [boolean, Map<T, string[][]>] => {
  const [results, setResults] = useState<Map<T, string[][]>>(new Map());
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(!!(objects && queryString));
    const timeoutId = setTimeout(async () => {
      const nextResults =
        objects && queryString ? await filterObjects(objects, queryStringToMatch(queryString)) : new Map();
      setResults(nextResults);
      setPending(false);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [queryString, objects]);

  return [pending, results];
};
