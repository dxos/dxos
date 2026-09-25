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

## Layers

| Entry point                     | Needs at runtime | Contents                                                                                                               |
| ------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@dxos/automerge-proxy`         | nothing          | Ops and transforms, client state, the draft that records `change()` calls, handle, repo, cursors, wire codec, contract |
| `@dxos/automerge-proxy/host`    | Automerge        | Sequencer, ops to and from Automerge patches, a `DocumentHost` over any store of Automerge documents                   |
| `@dxos/automerge-proxy/testing` | Automerge        | In-memory store and transport with controllable delivery, fast-check arbitraries                                       |

## The contract

`Contract.ts` defines the payloads as effect Schemas. ECHO's `MirrorService` in `@dxos/protocols`
wraps them in its RPCs and adds the subscription id and the space, so there is one definition.

`Repo.Host` is the host as a client reaches it. `Repo.ProxyRepo` programs against it, and ECHO's
`MirrorRepo` implements it over the worker's `MirrorService` and `DataService`:

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
SQLite index, so the host need not load the document to serve it.

## Status

| Step | What moves                                                                                                                                                                                   | State |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| A    | `echo-protocol/src/mirror/*` to the package root: ops, transform, client state and sequencer, wire; the contract schemas out of `MirrorService`                                              | done  |
| B1   | `echo-client/src/mirror/recorder.ts` to `Draft`: the draft a `change()` callback writes through, recording ops                                                                               | done  |
| B2   | `mirror-doc-handle.ts` to `Handle`, minus ECHO's replicas, errors and handle interface; `mirror-cursors.ts` to `Cursors`                                                                     | done  |
| B3   | The core of `mirror-repo.ts` (subscriptions, submit throttling, resubscribing) to `Repo`, over `Repo.Host`                                                                                   | done  |
| C    | `echo-host/src/mirror/document-sequencer.ts` to `Sequencing` and `automerge-ops.ts` to `AutomergeOps` in `/host`; the core of `mirror-service.ts` to `Host.DocumentHost` over a `Host.Store` | done  |

ECHO keeps adapters. `MirrorRepo` implements `ClientRepo` around `Repo.ProxyRepo`, with a `Repo.Host`
over its RPC services, reads from the index, Automerge replicas on `RepoProxy`, and its own error
types. `MirrorDocHandle` subclasses `Handle.DocHandle` for ECHO's handle interface and replica
leases. The worker's `MirrorServiceImpl` adapts `Host.DocumentHost` to RPC, with a `Host.Store` over
its Automerge host and a `Host.CopySource` over the SQLite index.

## Tests at the boundary

1. N clients and host-side writers apply random edits under random delivery delays; every client,
   the host and a plain Automerge replica end with the same value.
2. The draft against `A.change`: the same calls give the same document or the same refusal.
3. Transforms: applying a pair in either order converges.
4. The wire codec round-trips every value Automerge stores.
5. Cursors: positions minted and resolved through a trailing replica land on the same character.
6. Restart: the host loses its sequencer state mid-run; clients recover without losing or doubling
   edits.

Seeded random tests already cover 1 and 3 inside the package and in `echo-host`; fast-check
arbitraries would add shrinking, so a failure reduces to a few ops.
