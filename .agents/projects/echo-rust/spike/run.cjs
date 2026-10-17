//
// Copyright 2026 DXOS.org
//

// Loads the combined binary once and calls into the ECHO-side exports and the subduction exports.
const glue = process.argv[2];
const start = performance.now();
const binary = require(glue);
console.log('load+instantiate ms', (performance.now() - start).toFixed(1));
console.log('automerge_roundtrip(100) ->', binary.automerge_roundtrip(100));
const repo = new binary.SpikeRepo();
console.log('samod loader pending io ->', repo.step_loader(Date.now()));
console.log('sedimentree_summary ->', binary.sedimentree_summary(new Uint8Array(16)));
const signer = binary.MemorySigner.generate();
console.log('subduction MemorySigner peerId ->', signer.peerId().toString().slice(0, 16) + '...');
const storage = new binary.MemoryStorage();
console.log('subduction MemoryStorage ->', storage.constructor.name);
