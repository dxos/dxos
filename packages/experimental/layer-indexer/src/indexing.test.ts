import { test, bench } from 'vitest';
import { ChainedBatch, Level } from 'level';

type MyKey = string;
type MyValue = string;
type MyLevel = Level<MyKey, MyValue>;
type MyBatch = ChainedBatch<MyLevel, MyKey, MyValue>;

test('level basics', async ({ expect }) => {
  const db = new Level('/tmp/example' + Math.random(), { valueEncoding: 'utf8' });

  // Add an entry with key 'a' and value 1
  await db.put('a', 'foo');

  const value = await db.get('a');
  expect(value).toBe('foo');
});

test('index', async ({ expect }) => {
  const db = new Level('/tmp/example' + Math.random(), { valueEncoding: 'utf8' });
  await db.open();

  function addToIndex(batch: MyBatch, indexId: string, value: string, id: string) {
    batch.put(`index:${indexId}:entries:${value}:${id}`, '');
  }

  async function indexScan(indexName: string, value: string): Promise<string[]> {
    const iterator = db.iterator({
      gte: `index:${indexName}:entries:${value}:`,
      lte: `index:${indexName}:entries:${value}:\uffff`,
      values: false,
    });

    const results: string[] = [];
    for await (const [key] of iterator) {
      results.push(key.slice(key.lastIndexOf(':') + 1));
    }
    return results;
  }

  const batch = db.batch();

  addToIndex(batch, 'myindex', 'bar', '1');
  addToIndex(batch, 'myindex', 'baz', '2');
  addToIndex(batch, 'myindex', 'bar', '3');

  await batch.write();

  expect(await indexScan('myindex', 'bar')).toEqual(['1', '3']);
  expect(await indexScan('myindex', 'baz')).toEqual(['2']);
});
