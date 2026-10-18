# @dxos/collection-sync

Experimental, in-memory, dependency-free model of syncing a collection of documents between two peers.
The state being synced is a map `docId → heads`; each doc is a stand-in for an Automerge document (a DAG of changes).

## How it works

Every doc contributes one 64-bit item, `hash(docId, heads)`, to a set. Two peers are in sync exactly when their sets are
equal. Two mechanisms keep the sets equal:

- **Reconcile (RIBLT).** The initiator streams coded symbols from the responder's
  [rateless IBLT](https://arxiv.org/abs/2402.02668) and peels out the symmetric difference. Cost is ~1.35–2.5 symbols
  (20 B each) per differing item and does not depend on collection size. When the peers are in sync, a round is 1 symbol.
  The responder sizes the first batch from the set-size difference (a lower bound on the diff); after that, each batch
  doubles the total.
- **Push.** A local edit goes straight to the remote. The editing peer already knows what changed, so it doesn't need
  reconciliation to find it. Edits are coalesced per doc (`pushDelay`) and rate-limited (`pushBudget`).

Reconciliation finds divergence that nobody knows about: initial sync, partitions, lost messages. Push handles the
steady state. Once a round has named the differing docs, per-doc `doc-sync` messages exchange heads and only the
missing changes. A peer that sees heads it doesn't know replies with a `have` list of the changes it holds, which
Automerge sends as a Bloom filter and which the byte counts here price as one.

`RibltEncoder` is maintained incrementally. It caches the computed prefix of the symbol stream, and an add or remove
patches only the cached cells the item maps to. Each round reads from an `EncoderSnapshot`, which reverts on read any
changes made since the round started, so edits during a round don't corrupt it.

## Simulation

Time advances in ticks. `Network` delivers each message after a fixed or jittered latency (jitter reorders messages),
can drop messages, and can be partitioned. `Simulation` wires two `Peer`s together. `seedPeers` builds initial
conditions (shared, only-A/B, ahead, concurrent). `Workload` generates edits: steady, Poisson, or spikes.

## Tests

| File                       | Covers                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `riblt.test.ts`            | decode correctness, overhead vs d, independence from set size, incremental encoder, snapshots under churn                  |
| `doc.test.ts`              | heads, merges, missing-change computation, out-of-order delivery                                                             |
| `initial-sync.test.ts`     | 11 initial-condition scenarios, fast sync (size hint, batch size, latency), jitter, loss, both peers initiating, 25 random seeds |
| `incremental-sync.test.ts` | push latency, steady edits, spikes (backpressure, coalescing, RIBLT-only, both sides, mid-round), anti-entropy, partitions, 20-seed fuzz |
| `report.test.ts`           | prints metric tables comparing scenarios and strategies                                                                      |

```bash
moon run collection-sync:test
```
