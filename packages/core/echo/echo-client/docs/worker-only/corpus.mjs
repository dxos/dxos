//
// Copyright 2026 DXOS.org
//

// Builds a realistic space corpus with Automerge and saves each document's bytes.
// Usage: node corpus.mjs <out.json> <tasks> <docs> <paragraphs> <charsPerChange>
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const A = require('@automerge/automerge');

const [out, tasks = 200, docs = 3, paragraphs = 400, charsPerChange = 20] = process.argv
  .slice(2)
  .map((v, i) => (i === 0 ? v : Number(v)));
// mulberry32: an LCG here cycles quickly and makes text that compresses unrealistically well.
let seed = 7;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const words =
  'the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part'.split(
    ' ',
  );
const sentence = () =>
  Array.from({ length: 8 + Math.floor(rand() * 10) }, () => words[Math.floor(rand() * words.length)]).join(' ') + '. ';
const id = () => Array.from({ length: 26 }, () => 'ABCDEFGHJKMNPQRSTVWXYZ0123456789'[Math.floor(rand() * 31)]).join('');

const result = { docs: [] };
const save = (kind, doc) =>
  result.docs.push({ kind, bytes: Buffer.from(A.save(doc)).toString('base64'), changes: A.getAllChanges(doc).length });

// Tasks: one linked document each, created then edited a few times.
for (let t = 0; t < tasks; t++) {
  const objectId = id();
  let doc = A.from({
    objects: {
      [objectId]: {
        system: { type: { '/': 'dxn:type:org.dxos.type.task:0.1.0' }, createdAt: Date.now() },
        meta: { keys: [], tags: [] },
        data: { title: sentence().slice(0, 40), status: 'todo', description: sentence() + sentence() },
      },
    },
  });
  for (let e = 0; e < 4; e++) {
    doc = A.change(doc, (d) => {
      const data = d.objects[objectId].data;
      if (e % 2 === 0) {
        data.status = ['todo', 'doing', 'done'][e % 3];
      } else {
        A.splice(d, ['objects', objectId, 'data', 'description'], 0, 0, sentence());
      }
    });
  }
  save('task', doc);
}

// Documents: text typed in bursts of `charsPerChange` characters.
for (let n = 0; n < docs; n++) {
  const objectId = id();
  let doc = A.from({
    objects: {
      [objectId]: {
        system: { type: { '/': 'dxn:type:org.dxos.type.document:0.1.0' }, createdAt: Date.now() },
        meta: { keys: [], tags: [] },
        data: { name: `Doc ${n}`, content: '' },
      },
    },
  });
  let text = '';
  for (let p = 0; p < paragraphs; p++) {
    text += sentence() + sentence() + '\n\n';
  }
  for (let i = 0; i < text.length; i += charsPerChange) {
    const chunk = text.slice(i, i + charsPerChange);
    doc = A.change(doc, (d) => A.splice(d, ['objects', objectId, 'data', 'content'], i, 0, chunk));
  }
  save('document', doc);
}

// Space root: links to every linked document.
const links = {};
for (let i = 0; i < result.docs.length; i++) {
  links[id()] = new A.RawString(`automerge:${id()}`);
}
save('root', A.from({ access: { spaceKey: id() }, objects: {}, links }));

writeFileSync(out, JSON.stringify(result));
const summary = {};
for (const d of result.docs) {
  summary[d.kind] ??= { count: 0, changes: 0, bytes: 0 };
  summary[d.kind].count++;
  summary[d.kind].changes += d.changes;
  summary[d.kind].bytes += Buffer.from(d.bytes, 'base64').length;
}
console.log(JSON.stringify(summary));
