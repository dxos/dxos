//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { DXN, Format, Obj, Type } from '@dxos/echo';
import { TypeEnum } from '@dxos/echo/Format';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { SchemaEx } from '@dxos/effect';

import { exportRows, exportRowsAsCsv, exportRowsAsJson, exportRowsAsXml } from './export-rows-format';

const Person = Type.makeObject(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
  }),
);

describe('export-rows-format', () => {
  const columns = [
    { path: SchemaEx.createJsonPath(['name']), title: 'Name', type: TypeEnum.String },
    { path: SchemaEx.createJsonPath(['count']), title: 'Count', type: TypeEnum.Number },
  ];

  const rows = [{ name: 'Alpha', count: 1 }, { name: 'Beta, "quoted"', count: 2 }];

  test('csv exports visible columns with escaping', ({ expect }) => {
    const csv = exportRowsAsCsv(rows, columns);
    expect(csv).toBe(['Name,Count', 'Alpha,1', '"Beta, ""quoted""",2'].join('\n'));
  });

  test('xml exports visible columns', ({ expect }) => {
    const xml = exportRowsAsXml(rows, columns);
    expect(xml).toContain('<rows>');
    expect(xml).toContain('<Name>Alpha</Name>');
    expect(xml).toContain('<Count>1</Count>');
    expect(xml).toContain('<Name>Beta, &quot;quoted&quot;</Name>');
  });

  test('ref columns resolve referencePath for tabular export', ({ expect }) => {
    const refColumns = [
      {
        path: SchemaEx.createJsonPath(['owner']),
        title: 'Owner Name',
        type: TypeEnum.Ref,
        format: Format.TypeFormat.Ref,
        referencePath: SchemaEx.createJsonPath(['name']),
      },
    ];
    const refRows = [{ owner: { target: { name: 'Grace' } } }];
    expect(exportRowsAsCsv(refRows, refColumns)).toBe('Owner Name\nGrace');
  });

  describe('echo json export', () => {
    let builder: EchoTestBuilder;

    beforeEach(async () => {
      builder = await new EchoTestBuilder().open();
    });

    afterEach(async () => {
      await builder.close();
    });

    test('json exports dx.json format', async ({ expect }) => {
      const { db } = await builder.createDatabase({ types: [Person] });
      const person = db.add(Obj.make(Person, { name: 'Ada' }));
      await db.flush();

      const json = exportRowsAsJson([person]);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe(1);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.objects).toHaveLength(1);
      expect(parsed.objects[0].name).toBe('Ada');
      expect(parsed.objects[0]['@type']).toBeDefined();
      expect(exportRows('json', [person], columns).filename).toBe('table-export.dx.json');
    });
  });
});
