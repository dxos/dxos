import { test } from 'vitest';
import { next as am } from '@automerge/automerge';

test.only('compare versions', async ({ expect }) => {
  let doc = am.from({ a: 0, b: 0, c: 0 });

  for (let i = 0; i < 10; i++) {
    doc = am.change(doc, (doc) => doc.a++);
  }
  const baseHeads = am.getHeads(doc);

  let docA = am.clone(doc);
  let docB = am.clone(doc);

  for (let i = 0; i < 5; i++) {
    docA = am.change(docA, (doc) => doc.a++);
  }
  const headsA = am.getHeads(docA);

  for (let i = 0; i < 5; i++) {
    docB = am.change(docB, (doc) => doc.b++);
  }
  const headsB = am.getHeads(docB);

  console.log({
    baseHeads,
    headsA,
    headsB,
  })

  console.log({
    A__base: am.getMissingDeps(docA, baseHeads),
    base__A: am.getMissingDeps(doc, headsA),
    B__base: am.getMissingDeps(docB, baseHeads),
    base__B: am.getMissingDeps(doc, headsB),
    A__B: am.getMissingDeps(docA, headsB),
    B__A: am.getMissingDeps(docB, headsA),
  });
});