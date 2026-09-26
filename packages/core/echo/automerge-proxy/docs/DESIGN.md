# @dxos/automerge-proxy design

A document handle with Automerge's shape whose reads and writes are synchronous, backed by an
asynchronous contract with a host that holds the real Automerge document. The client needs no
Automerge at runtime.

## Why a package

1. The boundary is the contract, so it can be tested alone: many clients and a host over an
   in-memory transport, checked against real Automerge with fast-check.
2. Nothing in it is ECHO-specific. ECHO supplies a transport (its RPC services), a document store
   (its Automerge host) and extras (index copies, replicas).
3. Code outside DXOS that wants Automerge documents in a UI thread without wasm can use it.

## Entry points

The package is a subpath package: each namespace module has its own entry, and consumers import the
namespace they use (`import * as Repo from '@dxos/automerge-proxy/Repo'`). `dxos-subpath-imports`
rewrites a barrel import into that form, and `dxos-subpath-exports` checks the barrel against the
exports map. Importing only what a side needs is what keeps Automerge out of a client.

| Subpaths                                                                            | Needs at runtime | Side   |
| ----------------------------------------------------------------------------------- | ---------------- | ------ |
| `Repo`, `Handle`, `Draft`, `Cursors`, `Op`, `Transform`, `Sync`, `Wire`, `Contract` | nothing          | client |
| `Host`, `Sequencing`, `AutomergeOps`                                                | Automerge        | host   |
| `testing`                                                                           | Automerge        | tests  |

The root barrel re-exports every namespace, so it loads Automerge through `Host`; nothing in the
repo imports it.

## The contract

`Contract.ts` defines the payloads as effect Schemas. ECHO's `DataService` in `@dxos/protocols`
wraps them in its proxy RPCs (`subscribeProxy`, `updateProxySubscription`, `submit`,
`resolveCursors`, `createCursors`) and adds the subscription id and the space, so there is one
definition.

`Repo.Host` is the host as a client reaches it. `Repo.ProxyRepo` programs against it, and ECHO's
`MirrorRepo` implements it over the worker's `DataService`:

```ts
interface Host<Id extends string = string> {
  subscribe(
    request: { subscriptionId: string; clientId: string },
    handlers: { onEvents(events): void; onError(error): void; onClose(): void },
  ): () => void;
  updateSubscription(request: { subscriptionId: string; add?: Contract.Follow[]; remove?: string[] }): Promise<void>;
  submit(request: { subscriptionId: string; batches: Contract.SubmitBatch[] }): Promise<Contract.SubmitResult[]>;
  createDocument(initialValue: unknown): Promise<Id>;
  flush(documentIds: Id[]): Promise<void>;
  resolveCursors(request: Contract.ResolveCursors): Promise<(number | null)[]>;
  createCursors(request: Contract.CreateCursors): Promise<(string | null)[]>;
}
```

Values cross it plain. A transport that cannot carry RawStrings, bytes or dates encodes them with
`Wire`, as ECHO's does for JSON.

The events are `snapshot`, `entry`, `recovered`, `caughtUp`, `copy`, `requesting` and `unavailable`.
A `copy` is a read-only value at known heads that the host keeps outside Automerge, such as ECHO's
SQLite index, so the host need not load the document to serve it. A client that already holds a
copy, as ECHO's query results carry them, passes it to `Repo.ProxyRepo.find`, and the handle shows it
before the host answers.

## Status

| Step | What moves                                                                                                                                                                        | State |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| A    | `echo-protocol/src/mirror/*` to the package root: ops, transform, client state and sequencer, wire; the contract schemas out of `MirrorService`                                   | done  |
| B1   | `echo-client/src/mirror/recorder.ts` to `Draft`: the draft a `change()` callback writes through, recording ops                                                                    | done  |
| B2   | `mirror-doc-handle.ts` to `Handle`, minus ECHO's replicas, errors and handle interface; `mirror-cursors.ts` to `Cursors`                                                          | done  |
| B3   | The core of `mirror-repo.ts` (subscriptions, submit throttling, resubscribing) to `Repo`, over `Repo.Host`                                                                        | done  |
| C    | `echo-host/src/mirror/document-sequencer.ts` to `Sequencing` and `automerge-ops.ts` to `AutomergeOps`; the core of `mirror-service.ts` to `Host.DocumentHost` over a `Host.Store` | done  |

ECHO keeps adapters. `MirrorRepo` implements `ClientRepo` around `Repo.ProxyRepo`, with a `Repo.Host`
over its RPC services, reads from the index, Automerge replicas on `RepoProxy`, and its own error
types. `MirrorDocHandle` subclasses `Handle.DocHandle` for ECHO's handle interface and replica
leases. The worker's `DataServiceImpl` serves `Host.DocumentHost` as RPCs; `createProxyHost` builds
the host with a `Host.Store` over the Automerge host and a `Host.CopySource` over the SQLite index.
The host asks the store for a document only for the length of each call, so the store alone decides
what stays loaded between calls. The Automerge host under `createProxyHost` evicts a document 30 s
after its last lease, as it does every other document. A document followed through its copy is not
loaded at all.

[INTEGRATION.md](./INTEGRATION.md) plans how tab documents from the spike replace the mirror in this
package and in ECHO. [OP-IDS.md](./OP-IDS.md) proposes giving proxy documents Automerge's op ids, so cursors and recent
history resolve in the client and the client needs no Automerge.

## Tests at the boundary

`Repo.test.ts` runs `Repo.ProxyRepo` clients against a real `Host.DocumentHost`. `/testing` supplies
a `MemoryStore` of Automerge documents and a `Transport` that carries every call and event through
JSON with `Wire`, after a random delay, and can lose responses the host already acted on.

| Property                                                                                                                                  | Where                                          | How                  |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| Clients, a remote peer merging into the host's store, lost responses and host restarts end with every client equal to the host's document | `Repo.test.ts`                                 | fast-check, 25 runs  |
| Every edit lands exactly once through lost responses and restarts: each token appended by a client or the peer is in the result once      | `Repo.test.ts`                                 | fast-check, 25 runs  |
| The wire codec round-trips any value Automerge stores, including objects that look like its tags                                          | `Wire.test.ts`                                 | fast-check, 500 runs |
| The draft against `A.change`: the same calls give the same document or the same refusal                                                   | `Draft.test.ts`                                | seeded, and 67 cases |
| Transforms converge in either order; tabs and a remote writer converge                                                                    | `Transform.test.ts`, `Transform.cases.test.ts` | seeded, and 22 cases |
| Tabs, a remote peer and host restarts converge with every edit applied once, at the protocol level                                        | `host/Sequencing.test.ts`                      | seeded               |
| Cursors created on one client resolve on another                                                                                          | `Repo.test.ts`, `Cursors.test.ts`              | cases                |

Disabling the host's check for a resent batch makes the exactly-once property fail on its first run,
shrunk to about ten steps. The convergence property alone cannot see that: clients follow the host,
so they agree with it even when it applied a batch twice.

The properties found three defects, each fixed at its cause and pinned by a case:

1. A lost `updateSubscription` response made the repo ask again, so the host answered twice. A batch
   sent between the two answers was settled by both: requeued by the second, and applied twice. The
   repo now replaces the subscription instead of asking again (`Repo.ts`), and a handle ignores a
   snapshot no newer than what it holds (`Handle.test.ts`).
2. The subscription id was fixed per repo, so a request made for one stream and delayed past a
   reconnect was answered on the next, from what the client held before. Each stream now has its own
   id (`Repo.test.ts`: a subscription request held past a reconnect).
3. JSON carries neither NaN, the infinities nor negative zero, all of which Automerge stores: a
   document holding NaN read `null` on a client. `Wire` now tags them (`Wire.test.ts`).
