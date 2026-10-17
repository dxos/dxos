//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AttenuationError } from './errors.ts';
import * as Permission from './Permission.ts';
import * as Policy from './Policy.ts';
import * as Principal from './Principal.ts';

/** The optional third-party caveat: the grant only works once `by` has recorded a matching consent. */
export const ConsentCondition = Schema.Struct({
  by: Principal.Principal,
  scope: Schema.optional(Schema.Literals(['once', 'session', 'standing'])),
});
export type ConsentCondition = Schema.Schema.Type<typeof ConsentCondition>;

/**
 * The member who signs a grant issued by a space. Signed with the payload, so a relay cannot
 * substitute it; the role is what the signer claimed and `check` re-reads the real one from its
 * source rather than trusting it.
 */
export const Signer = Schema.Struct({ did: Schema.String, role: Schema.String });
export type Signer = Schema.Schema.Type<typeof Signer>;

/** The signed part of a grant: everything except `id` and the unsigned `meta`. */
export const Payload = Schema.Struct({
  issuer: Principal.Principal,
  audience: Principal.Principal,
  permissions: Schema.Array(Permission.Permission),
  proofs: Schema.optional(Schema.Array(Schema.String)),
  notBefore: Schema.optional(Schema.Number),
  expiresAt: Schema.optional(Schema.Number),
  delegable: Schema.optional(Schema.Boolean),
  consent: Schema.optional(ConsentCondition),
  signer: Schema.optional(Signer),
}).pipe(Schema.annotate({ title: 'GrantPayload' }));
export type Payload = Schema.Schema.Type<typeof Payload>;

/** A grant: the payload plus its content id and an unsigned `meta` for audit. */
export const Grant = Schema.Struct({
  id: Schema.String,
  ...Payload.fields,
  meta: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
}).pipe(Schema.annotate({ title: 'Grant' }));
export type Grant = Schema.Schema.Type<typeof Grant>;

export const decode = Schema.decodeUnknownSync(Grant);
export const encode = Schema.encodeSync(Grant);

const PAYLOAD_KEYS = Object.keys(Payload.fields);

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => [key, sortKeys(record[key])]),
    );
  }
  return value;
};

/** Canonical JSON of the payload (sorted keys, no whitespace), which is what a signer signs and the id hashes. */
export const canonical = (payload: Payload): string => {
  const record = payload as Record<string, unknown>;
  return JSON.stringify(sortKeys(Object.fromEntries(PAYLOAD_KEYS.map((key) => [key, record[key]]))));
};

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const toBase58 = (bytes: Uint8Array): string => {
  let value = bytes.reduce((acc, byte) => (acc << 8n) + BigInt(byte), 0n);
  let encoded = '';
  while (value > 0n) {
    encoded = BASE58[Number(value % 58n)] + encoded;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) {
      break;
    }
    encoded = `1${encoded}`;
  }
  return encoded;
};

const sha256 = (text: string): Effect.Effect<Uint8Array> =>
  Effect.promise(
    async () => new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))),
  );

/** The content id of a payload: base58 of the sha256 of its canonical form. */
export const idOf = (payload: Payload): Effect.Effect<string> => sha256(canonical(payload)).pipe(Effect.map(toBase58));

export type MakeOptions = Omit<Payload, 'permissions'> & {
  permissions: readonly Permission.Permission[];
  meta?: Record<string, unknown>;
};

/** Builds a grant, deriving `id` from the canonical payload. */
export const make: (options: MakeOptions) => Effect.Effect<Grant> = Effect.fnUntraced(function* ({
  meta,
  ...payload
}: MakeOptions) {
  const decoded = Schema.decodeUnknownSync(Payload)(sortKeys(payload));
  const id = yield* idOf(decoded);
  return Schema.decodeUnknownSync(Grant)({ id, ...decoded, ...(meta ? { meta } : {}) });
});

/** Whether the grant's id matches its payload, so a tampered grant is caught before any signature check. */
export const verifyId = (grant: Grant): Effect.Effect<boolean> => idOf(grant).pipe(Effect.map((id) => id === grant.id));

export const inMinutes = (minutes: number, now: number = Date.now()): number => now + minutes * 60_000;
export const inHours = (hours: number, now: number = Date.now()): number => inMinutes(hours * 60, now);
export const inDays = (days: number, now: number = Date.now()): number => inHours(days * 24, now);

export type Inactive = 'not-yet-valid' | 'expired';

/** Why the grant is outside its time window at `now`, or undefined when it is inside. */
export const inactiveReason = (grant: Pick<Grant, 'notBefore' | 'expiresAt'>, now: number): Inactive | undefined => {
  if (grant.notBefore !== undefined && now < grant.notBefore) {
    return 'not-yet-valid';
  }
  if (grant.expiresAt !== undefined && now >= grant.expiresAt) {
    return 'expired';
  }
  return undefined;
};

export const isActive = (grant: Pick<Grant, 'notBefore' | 'expiresAt'>, now: number = Date.now()): boolean =>
  inactiveReason(grant, now) === undefined;

/** The permissions of a grant that cover the given subject and command. */
export const covering = (
  grant: Pick<Grant, 'permissions'>,
  permission: Pick<Permission.Permission, 'subject' | 'command'>,
): readonly Permission.Permission[] =>
  grant.permissions.filter((candidate) => Permission.covers(candidate, permission));

/** Whether some permission of the grant covers the subject and command. */
export const covers = (
  grant: Pick<Grant, 'permissions'>,
  permission: Pick<Permission.Permission, 'subject' | 'command'>,
): boolean => covering(grant, permission).length > 0;

export type AttenuateRequest = Omit<Payload, 'issuer' | 'proofs' | 'permissions' | 'signer'> & {
  permissions: readonly Permission.Permission[];
  meta?: Record<string, unknown>;
};

export type AttenuateOptions = {
  now?: number;
  /** Required when a parent's audience is a space, since the space signs through one of its members. */
  signer?: Signer;
};

/**
 * Mints a child grant covered by the parent grants: every requested permission must be covered by
 * a delegable parent inside its window, the parent's policy is conjoined onto the child's, the
 * child's window shrinks to fit, and the parents become the proofs. A space-held parent's caller
 * predicates bind the signing member, judged here and again by `check` against the member's real
 * role, and so are not carried onto the child.
 */
export const attenuate: (
  parents: readonly Grant[],
  request: AttenuateRequest,
  options?: AttenuateOptions,
) => Effect.Effect<Grant, AttenuationError> = Effect.fn('Grant.attenuate')(function* (
  parents: readonly Grant[],
  request: AttenuateRequest,
  { now = Date.now(), signer }: AttenuateOptions = {},
) {
  const issuers = new Set(parents.map((parent) => parent.audience));
  if (issuers.size !== 1) {
    return yield* Effect.fail(
      new AttenuationError({
        message: 'Parent grants must share one audience',
        context: { audiences: [...issuers] },
      }),
    );
  }
  const [issuer] = issuers;

  const permissions: Permission.Permission[] = [];
  const proofs = new Set<string>();
  let notBefore = request.notBefore;
  let expiresAt = request.expiresAt;
  for (const requested of request.permissions) {
    const parent = parents.find(
      (candidate) => candidate.delegable === true && isActive(candidate, now) && covers(candidate, requested),
    );
    if (!parent) {
      return yield* Effect.fail(
        new AttenuationError({
          context: { subject: requested.subject, command: requested.command, issuer },
        }),
      );
    }
    if (Principal.kind(parent.audience) === 'space') {
      if (!signer) {
        return yield* Effect.fail(
          new AttenuationError({ message: 'A member must sign on behalf of the space', context: { space: issuer } }),
        );
      }
      const floor = Policy.callerOnly(Policy.conjoin(covering(parent, requested).map((entry) => entry.policy ?? [])));
      const verdict = Policy.evaluate(floor, { args: undefined, caller: signer });
      if (verdict._tag === 'Failure') {
        return yield* Effect.fail(
          new AttenuationError({
            message: "Signer's role does not satisfy the parent grant",
            context: { space: issuer, signer, predicate: verdict.failure.predicate },
          }),
        );
      }
    }
    const parentPolicy = Policy.conjoin(covering(parent, requested).map((entry) => entry.policy ?? []));
    const carried =
      Principal.kind(parent.audience) === 'space'
        ? parentPolicy.filter((predicate) => !Policy.callerOnly([predicate]).length)
        : parentPolicy;
    permissions.push(
      Permission.make({
        subject: requested.subject,
        command: requested.command,
        policy: Policy.conjoin([carried, requested.policy ?? []]),
      }),
    );
    proofs.add(parent.id);
    notBefore = maxDefined(notBefore, parent.notBefore);
    expiresAt = minDefined(expiresAt, parent.expiresAt);
  }

  return yield* make({
    issuer,
    audience: request.audience,
    permissions,
    proofs: [...proofs],
    notBefore,
    expiresAt,
    delegable: request.delegable,
    consent: request.consent,
    signer,
    meta: request.meta,
  });
});

const maxDefined = (left: number | undefined, right: number | undefined): number | undefined =>
  left === undefined ? right : right === undefined ? left : Math.max(left, right);

const minDefined = (left: number | undefined, right: number | undefined): number | undefined =>
  left === undefined ? right : right === undefined ? left : Math.min(left, right);
