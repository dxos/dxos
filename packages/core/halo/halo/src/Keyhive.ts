//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { IdentityDid } from '@dxos/keys';

import { InvalidSignatureError, MissingDependencyError, NotAuthorizedError, UnknownPrincipalError } from './errors';

/**
 * Prototype Keyhive service: a pure-TypeScript, in-memory implementation of the Keyhive
 * membership model (https://www.inkandswitch.com/keyhive/notebook/).
 *
 * Why a prototype and not the real library:
 * - Keyhive is NOT published to npm (`keyhive`, `keyhive_wasm`, and `@inkandswitch/keyhive` all 404).
 *   It is a pre-alpha Rust workspace; the JS surface (`keyhive_wasm`) exists only as wasm-bindgen
 *   bindings built from source, is unaudited, and its API is explicitly unstable.
 * - Subduction (the successor sync protocol) IS published (`@automerge/automerge-subduction`) and is
 *   already in this repo's catalog, but the Keyhive authorization layer itself is not.
 *
 * This module therefore mirrors the `keyhive_wasm` binding surface (keyhive, individual, group,
 * membered, delegation, revocation, access, contact_card, signer, archive) so that a WASM-backed
 * `Layer` can replace {@link layerMemory} without changing callers. Keep this interface aligned
 * with the bindings in `keyhive_wasm/src/js/` when they stabilize.
 *
 * Semantics implemented (per the Keyhive design docs):
 * - Ordered `Access` capability levels with attenuated sub-delegation: any member may delegate
 *   up to (but not above) their own effective access; effective access is the minimum along the
 *   delegation chain from the group's self-certifying root.
 * - Membership as a hash-linked DAG of signed delegation/revocation ops (`authPred` = causal
 *   predecessors), requiring only causal order — no consensus.
 * - Revocation with causal seniority: admins may revoke anyone; non-admins only members whose
 *   earliest admission they causally precede.
 * - Removal wins: a delegation for a revoked subject is only valid if it causally succeeds every
 *   revocation of that subject (re-adding requires having seen the removal).
 * - Real Ed25519 signatures (WebCrypto/SubtleCrypto) over a canonical JSON encoding; principal
 *   ids are DIDs derived from the SHA-256 of the public key (matching `IdentityDid`).
 *
 * Deliberately omitted — these require the real Rust implementation and are out of scope for the
 * membership prototype:
 * - BeeKEM/CGKA (concurrent group key agreement), `PcsKey`, and `ApplicationSecret` derivation —
 *   i.e. no content encryption; this layer only answers "who may do what".
 * - Real X25519 prekeys: {@link ContactCard.shareKey} carries placeholder random bytes so the
 *   shape matches Keyhive's contact card (id + fresh share key + signature).
 * - Sedimentree chunking and RIBLT set reconciliation; {@link ops}/{@link receiveOps} expose a
 *   naive full-set exchange sufficient for tests and local multi-peer scenarios.
 * - Op buffering: Keyhive buffers ops whose causal dependencies have not yet arrived;
 *   {@link receiveOps} instead fails with `MissingDependencyError` (callers retry in order).
 *
 * Prototype simplification: authority is validated in causal (topological) processing order
 * against the running membership state rather than against each op's exact causal ancestry.
 * For linear histories the two are identical; for concurrent branches this is an approximation
 * that the WASM-backed layer will replace with Keyhive's exact rules.
 */

/**
 * A principal (individual, group, or document) addressed by a DID derived from its public key.
 * Mirrors Keyhive `Identifier`/`IndividualId`/`GroupId`.
 */
export type PrincipalId = IdentityDid;

/**
 * Hash id of a membership operation (hex SHA-256 of the canonical payload).
 */
export type OpId = string;

/**
 * Capability level, matching the Keyhive `Access` enum (`Pull`/`Read`/`Edit`/`Admin`).
 * Ordered; each level implies all lower levels.
 */
export type Access = 'pull' | 'read' | 'edit' | 'admin';

const ACCESS_ORDER: Record<Access, number> = { pull: 0, read: 1, edit: 2, admin: 3 };

/**
 * Returns true if `a` implies (is at least) `b`.
 */
export const implies = (a: Access, b: Access): boolean => ACCESS_ORDER[a] >= ACCESS_ORDER[b];

/**
 * Membership grant: adds `subject` to `group` with (attenuated) `access`.
 * Mirrors Keyhive `Delegation`.
 */
export type Delegation = {
  kind: 'delegation';
  group: PrincipalId;
  subject: PrincipalId;
  access: Access;
  /** Causal predecessors in the group's membership DAG (heads at issue time). */
  authPred: OpId[];
};

/**
 * Membership removal. Mirrors Keyhive `Revocation`.
 */
export type Revocation = {
  kind: 'revocation';
  group: PrincipalId;
  subject: PrincipalId;
  authPred: OpId[];
};

export type Op = Delegation | Revocation;

/**
 * Signed membership operation. Mirrors Keyhive `SignedDelegation`/`SignedRevocation`.
 * `authorKey` is the raw Ed25519 public key (hex) so ops are self-verifying;
 * `author` must equal the DID derived from it.
 */
export type SignedOp = {
  id: OpId;
  author: PrincipalId;
  authorKey: string;
  payload: Op;
  signature: string;
};

/**
 * Shareable identity credential: id + fresh share key + signature.
 * Mirrors Keyhive `ContactCard` (a signed `KeyOp`). Exchanging contact cards is how identities
 * are introduced so they can be delegated into groups — including while offline via prekeys.
 * `shareKey` is a placeholder for a real X25519 prekey (see module comment).
 */
export type ContactCard = {
  id: PrincipalId;
  signingKey: string;
  shareKey: string;
  signature: string;
};

/**
 * Materialized membership entry (projection of the DAG; see `Group` schema).
 */
export type Member = {
  subject: PrincipalId;
  access: Access;
};

/**
 * Effect service tag for the Keyhive prototype.
 */
export class Service extends Context.Tag('@dxos/halo/Keyhive/Service')<
  Service,
  {
    /** DID of the local (active) individual. Mirrors Keyhive `Active`. */
    readonly active: PrincipalId;
    /** Issue a contact card for the local individual. */
    contactCard(): Effect.Effect<ContactCard>;
    /** Learn a remote principal from its contact card; returns its id. */
    receiveContactCard(card: ContactCard): Effect.Effect<PrincipalId, InvalidSignatureError>;
    /** Create a group with the active individual as root admin (self-certifying root). */
    createGroup(): Effect.Effect<PrincipalId>;
    /** Delegate (attenuated) access to a known principal. */
    delegate(opts: {
      group: PrincipalId;
      subject: PrincipalId;
      access: Access;
    }): Effect.Effect<SignedOp, NotAuthorizedError | UnknownPrincipalError>;
    /** Revoke a member (admin: anyone; non-admin: causal seniority only). */
    revoke(opts: {
      group: PrincipalId;
      subject: PrincipalId;
    }): Effect.Effect<SignedOp, NotAuthorizedError | UnknownPrincipalError>;
    /** Materialize current membership from the DAG. */
    members(group: PrincipalId): Effect.Effect<Member[], UnknownPrincipalError>;
    /** All ops for a group (naive sync export). */
    ops(group: PrincipalId): Effect.Effect<SignedOp[], UnknownPrincipalError>;
    /** Ingest remote ops (naive sync import); ops must arrive causally ordered. */
    receiveOps(ops: SignedOp[]): Effect.Effect<void, InvalidSignatureError | MissingDependencyError>;
  }
>() {}

export const contactCard = Effect.gen(function* () {
  const service = yield* Service;
  return yield* service.contactCard();
});

export const receiveContactCard = (card: ContactCard) =>
  Effect.gen(function* () {
    const service = yield* Service;
    return yield* service.receiveContactCard(card);
  });

export const createGroup = Effect.gen(function* () {
  const service = yield* Service;
  return yield* service.createGroup();
});

export const delegate = (opts: { group: PrincipalId; subject: PrincipalId; access: Access }) =>
  Effect.gen(function* () {
    const service = yield* Service;
    return yield* service.delegate(opts);
  });

export const revoke = (opts: { group: PrincipalId; subject: PrincipalId }) =>
  Effect.gen(function* () {
    const service = yield* Service;
    return yield* service.revoke(opts);
  });

export const members = (group: PrincipalId) =>
  Effect.gen(function* () {
    const service = yield* Service;
    return yield* service.members(group);
  });

//
// In-memory implementation.
//

type KeyPair = { publicKey: CryptoKey; privateKey: CryptoKey; publicKeyHex: string; did: PrincipalId };

type GroupState = {
  /** Ops in arrival (causal) order; keyed for dependency checks. */
  ops: Map<OpId, SignedOp>;
  /** Current DAG heads (ops not yet referenced as a predecessor). */
  heads: Set<OpId>;
};

const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{2}/g)?.map((pair) => parseInt(pair, 16)) ?? []);

/** Deterministic JSON encoding (sorted keys) so signatures and hashes are canonical. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val,
  );

// The `as BufferSource` casts below bridge a lib typing gap: TS 5.7 generic typed arrays
// (`Uint8Array<ArrayBufferLike>`) are not assignable to DOM `BufferSource`; no typed
// alternative exists.
const sha256 = async (data: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource));

/** DID derived from the SHA-256 of the raw public key, truncated to `IdentityDid.byteLength`. */
const didFromKey = async (publicKeyRaw: Uint8Array): Promise<PrincipalId> =>
  IdentityDid.encode((await sha256(publicKeyRaw)).slice(0, IdentityDid.byteLength));

const generateKeyPair = async (): Promise<KeyPair> => {
  // Cast: `generateKey` is typed `CryptoKey | CryptoKeyPair`; asymmetric algorithms always
  // return a pair, but lib.dom cannot narrow on the algorithm string.
  const { publicKey, privateKey } = (await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
  return { publicKey, privateKey, publicKeyHex: toHex(raw), did: await didFromKey(raw) };
};

const sign = async (privateKey: CryptoKey, payload: string): Promise<string> =>
  toHex(new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, textEncoder.encode(payload))));

const verify = async (publicKeyRaw: Uint8Array, signature: string, payload: string): Promise<boolean> => {
  const key = await crypto.subtle.importKey('raw', publicKeyRaw as BufferSource, 'Ed25519', false, ['verify']);
  return crypto.subtle.verify('Ed25519', key, fromHex(signature) as BufferSource, textEncoder.encode(payload));
};

const makeSignedOp = async (keyPair: KeyPair, payload: Op): Promise<SignedOp> => {
  const encoded = canonical(payload);
  return {
    id: toHex(await sha256(textEncoder.encode(encoded))),
    author: keyPair.did,
    authorKey: keyPair.publicKeyHex,
    payload,
    signature: await sign(keyPair.privateKey, encoded),
  };
};

/**
 * Evaluates the membership DAG into effective access per subject, applying the rules from the
 * module comment (attenuation, causal seniority, removal wins).
 */
const materialize = (group: PrincipalId, state: GroupState): Map<PrincipalId, Access> => {
  const result = new Map<PrincipalId, Access>();
  // Ancestor sets for the removal-wins and seniority rules.
  const ancestors = new Map<OpId, Set<OpId>>();
  // Earliest admission op per subject (for causal seniority).
  const firstAdmission = new Map<PrincipalId, OpId>();
  const revocations: SignedOp[] = [];

  for (const op of state.ops.values()) {
    const ancestorSet = new Set<OpId>();
    for (const pred of op.payload.authPred) {
      ancestorSet.add(pred);
      for (const transitive of ancestors.get(pred) ?? []) {
        ancestorSet.add(transitive);
      }
    }
    ancestors.set(op.id, ancestorSet);

    if (op.payload.kind === 'delegation') {
      const { subject, access } = op.payload;
      // Removal wins: a delegation is void unless it causally succeeds every prior revocation
      // of its subject.
      if (revocations.some((rev) => rev.payload.subject === subject && !ancestorSet.has(rev.id))) {
        continue;
      }
      // Authority: the group key itself (self-certifying root), or a member attenuating
      // their own effective access.
      const authorAccess = op.author === group ? 'admin' : result.get(op.author);
      if (!authorAccess || !implies(authorAccess, access)) {
        continue;
      }
      const granted = implies(authorAccess, access) ? access : authorAccess;
      const current = result.get(subject);
      if (!current || implies(granted, current)) {
        result.set(subject, granted);
      }
      if (!firstAdmission.has(subject)) {
        firstAdmission.set(subject, op.id);
      }
    } else {
      const { subject } = op.payload;
      const authorAccess = op.author === group ? 'admin' : result.get(op.author);
      if (!authorAccess) {
        continue;
      }
      // Causal seniority: non-admins may only revoke members admitted causally after themselves.
      if (authorAccess !== 'admin') {
        const authorFirst = firstAdmission.get(op.author);
        const subjectFirst = firstAdmission.get(subject);
        if (!authorFirst || !subjectFirst || !(ancestors.get(subjectFirst)?.has(authorFirst) ?? false)) {
          continue;
        }
      }
      result.delete(subject);
      revocations.push(op);
    }
  }

  return result;
};

/**
 * Creates an in-memory service instance (a peer with a fresh local signing key).
 * Mirrors the `keyhive_wasm` `Keyhive` constructor.
 */
export const make = async (): Promise<Context.Tag.Service<Service>> => {
  const active = await generateKeyPair();
  // Raw public keys of known principals (learned via contact cards, group creation, or ops).
  const knownKeys = new Map<PrincipalId, string>([[active.did, active.publicKeyHex]]);
  const groups = new Map<PrincipalId, GroupState>();

  const appendOp = (state: GroupState, op: SignedOp): void => {
    state.ops.set(op.id, op);
    for (const pred of op.payload.authPred) {
      state.heads.delete(pred);
    }
    state.heads.add(op.id);
  };

  const issueOp = (state: GroupState, payload: Op) =>
    Effect.promise(async () => {
      const op = await makeSignedOp(active, payload);
      appendOp(state, op);
      return op;
    });

  const requireGroup = (group: PrincipalId) => {
    const state = groups.get(group);
    return state ? Effect.succeed(state) : Effect.fail(new UnknownPrincipalError({ context: { principal: group } }));
  };

  return {
    active: active.did,

    contactCard: () =>
      Effect.promise(async () => {
        // Fresh placeholder share key per card, mirroring Keyhive's fresh prekey per contact card.
        const shareKey = toHex(crypto.getRandomValues(new Uint8Array(32)));
        const payload = { id: active.did, signingKey: active.publicKeyHex, shareKey };
        return { ...payload, signature: await sign(active.privateKey, canonical(payload)) };
      }),

    receiveContactCard: (card) =>
      Effect.gen(function* () {
        const { signature, ...payload } = card;
        const valid = yield* Effect.promise(() => verify(fromHex(card.signingKey), signature, canonical(payload)));
        const did = yield* Effect.promise(() => didFromKey(fromHex(card.signingKey)));
        if (!valid || did !== card.id) {
          return yield* Effect.fail(new InvalidSignatureError({ context: { principal: card.id } }));
        }
        knownKeys.set(card.id, card.signingKey);
        return card.id;
      }),

    createGroup: () =>
      Effect.promise(async () => {
        // The group key signs only the root delegation (self-certifying root); the secret is
        // discarded afterwards so the root cannot be forged later — subsequent ops are signed
        // by members.
        const groupKey = await generateKeyPair();
        const state: GroupState = { ops: new Map(), heads: new Set() };
        const root = await makeSignedOp(groupKey, {
          kind: 'delegation',
          group: groupKey.did,
          subject: active.did,
          access: 'admin',
          authPred: [],
        });
        appendOp(state, root);
        groups.set(groupKey.did, state);
        knownKeys.set(groupKey.did, groupKey.publicKeyHex);
        return groupKey.did;
      }),

    delegate: ({ group, subject, access }) =>
      Effect.gen(function* () {
        const state = yield* requireGroup(group);
        if (!knownKeys.has(subject)) {
          return yield* Effect.fail(new UnknownPrincipalError({ context: { principal: subject } }));
        }
        const current = materialize(group, state).get(active.did);
        if (!current || !implies(current, access)) {
          return yield* Effect.fail(new NotAuthorizedError({ context: { group, subject, access } }));
        }
        return yield* issueOp(state, { kind: 'delegation', group, subject, access, authPred: [...state.heads] });
      }),

    revoke: ({ group, subject }) =>
      Effect.gen(function* () {
        const state = yield* requireGroup(group);
        const membership = materialize(group, state);
        const current = membership.get(active.did);
        if (!current || !membership.has(subject)) {
          return yield* Effect.fail(new NotAuthorizedError({ context: { group, subject } }));
        }
        return yield* issueOp(state, { kind: 'revocation', group, subject, authPred: [...state.heads] });
      }),

    members: (group) =>
      Effect.map(requireGroup(group), (state) =>
        Array.from(materialize(group, state), ([subject, access]) => ({ subject, access })),
      ),

    ops: (group) => Effect.map(requireGroup(group), (state) => [...state.ops.values()]),

    receiveOps: (ops) =>
      Effect.gen(function* () {
        for (const op of ops) {
          const state = groups.get(op.payload.group) ?? { ops: new Map(), heads: new Set<OpId>() };
          groups.set(op.payload.group, state);
          if (state.ops.has(op.id)) {
            continue;
          }
          const encoded = canonical(op.payload);
          const valid = yield* Effect.promise(() => verify(fromHex(op.authorKey), op.signature, encoded));
          const did = yield* Effect.promise(() => didFromKey(fromHex(op.authorKey)));
          if (!valid || did !== op.author) {
            return yield* Effect.fail(new InvalidSignatureError({ context: { op: op.id } }));
          }
          if (op.payload.authPred.some((pred) => !state.ops.has(pred))) {
            return yield* Effect.fail(new MissingDependencyError({ context: { op: op.id } }));
          }
          knownKeys.set(op.author, op.authorKey);
          appendOp(state, op);
        }
      }),
  };
};

/**
 * Layer providing an existing service instance (e.g. a peer shared across programs).
 */
export const layer = (service: Context.Tag.Service<Service>): Layer.Layer<Service> => Layer.succeed(Service, service);

/**
 * In-memory prototype layer; constructs a fresh peer per build. Replace with a
 * `keyhive_wasm`-backed layer (same `Service` shape) once Keyhive is consumable as a package.
 */
export const layerMemory = (): Layer.Layer<Service> => Layer.effect(Service, Effect.promise(make));
