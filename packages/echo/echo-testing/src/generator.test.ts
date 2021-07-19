//
// Copyright 2020 DXOS.org
//

import { createTestInstance } from '@dxos/echo-db';
import { Matcher, Predicate } from '@dxos/object-model';

import { Generator, OBJECT_PERSON } from './generator';

test('generator', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();
  const generator = new Generator(party.database, { seed: 100 });
  await generator.generate({
    numPeople: 3
  });

  const result = party.database.select(s => s.filter({ type: OBJECT_PERSON }).items);
  expect(result.getValue()).toHaveLength(3);

  const names = result.getValue().map(item => item.model.getProperty('name'));
  expect(names).toHaveLength(3);

  await echo.close();
});

test('filter', async () => {
  const echo = await createTestInstance({ initialize: true });
  const party = await echo.createParty();
  const generator = new Generator(party.database, { seed: 100 });
  await generator.generate({
    numPeople: 3
  });

  const query = {
    root: {
      op: Predicate.Operation.TEXT_MATCH,
      key: 'name',
      value: {
        string: 'Karianne'
      }
    }
  };
  const matcher = new Matcher({ getter: (item: any, key: string) => item.model.getProperty(key) });
  const result = party.database.select(s => s.filter({ type: OBJECT_PERSON }).filter(matcher.getFilter(query)).items);
  expect(result.getValue()).toHaveLength(1);

  await echo.close();
});
