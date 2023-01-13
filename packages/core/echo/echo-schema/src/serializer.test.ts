//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { id } from './defs';
import { Document } from './document';
import { SerializedSpace, Serializer } from './serializer';
import { createDatabase } from './testing';

describe('Serializer', () => {
  // TODO(burdon): Implement.
  test.skip('Basic', async () => {
    const serializer = new Serializer();

    let data: SerializedSpace;

    {
      const db = await createDatabase();
      const obj = new Document();
      obj.title = 'Test';
      await db.save(obj);
      expect(db.objects).to.have.length(1);

      data = await serializer.export(db);
      expect(data.objects).to.have.length(1);
      expect(data.objects[0]).to.deep.eq({
        '@id': obj[id],
        title: 'Test'
      });
    }

    {
      const db = await createDatabase();
      await serializer.import(db, data);

      const query = db.query();
      const objects = query.getObjects();
      expect(objects).to.have.length(1);
      expect(objects[0].title).to.eq('Test');
    }
  });

  // TODO(burdon): Create typed tests in echo-typegen.
});
