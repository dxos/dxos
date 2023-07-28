import { describe, test } from "@dxos/test";
import { createDatabase } from "./testing";
import { Expando } from "./typed-object";
import { clone } from "./clone";
import { expect } from "chai";

describe('clone', () => {
  test('clone to a different database', async () => {
    const { db: db1 } = await createDatabase();
    const { db: db2 } = await createDatabase();

    const task1 = new Expando({
      title: 'Main task',
      tags: ['red', 'green'],
    });
    db1.add(task1);
    await db1.flush();

    const task2 = clone(task1);
    expect(task2 !== task1).to.be.true;
    expect(task2.id).to.equal(task1.id);
    expect(task2.title).to.equal(task1.title);
    expect([...task2.tags]).to.deep.equal([...task1.tags]);

    db2.add(task2);
    await db2.flush();
    expect(task2.id).to.equal(task1.id);

    expect(() => db1.add(task1)).to.throw;
  })
})