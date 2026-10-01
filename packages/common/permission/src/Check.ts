//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Consent from './Consent.ts';
import { SubjectResolutionError } from './errors.ts';
import * as Grant from './Grant.ts';
import * as Permission from './Permission.ts';
import * as Policy from './Policy.ts';
import * as Principal from './Principal.ts';
import * as Requirement from './Requirement.ts';
import * as Subject from './Subject.ts';

/** Facts about the invoker that a policy can read under `.caller`; `role` is its role in the subject's space. */
export type Caller = { readonly did?: string; readonly role?: string; readonly [key: string]: unknown };

/** A membership fact: the roles that make a principal an owner of a space's subjects are `owner` and `admin`. */
export type Membership = { readonly spaceId: string; readonly principal: Principal.Principal; readonly role: string };

export const OWNING_ROLES: readonly string[] = ['owner', 'admin'];

/**
 * Where grants come from. An interface rather than a store so grants can be derived (membership)
 * or attested (a process environment); sources compose with `merge`.
 */
export interface GrantSource {
  /** The grant with this id, when the source holds it. */
  get(id: string): Effect.Effect<Grant.Grant | undefined>;
  /** Every grant whose audience is the principal. */
  grantsFor(audience: Principal.Principal): Effect.Effect<readonly Grant.Grant[]>;
  isRevoked(id: string): Effect.Effect<boolean>;
  /** Whether the principal is a member of the space, which is what makes a space-audience grant theirs. */
  isMember(principal: Principal.Principal, spaceId: string): Effect.Effect<boolean>;
  /** Whether the principal may issue a root grant for the subject: a space owns its subjects, so do its owners and admins. */
  ownsSubject(issuer: Principal.Principal, subject: Subject.Subject): Effect.Effect<boolean>;
  /** The active consent recorded by `by` for the grant, if any. */
  consentFor(grantId: string, by: Principal.Principal): Effect.Effect<Consent.Consent | undefined>;
}

export type FromGrantsOptions = {
  grants?: readonly Grant.Grant[];
  revoked?: readonly string[];
  members?: readonly Membership[];
  consents?: readonly Consent.Consent[];
  /** Principals trusted to root a grant for any subject, such as the process runtime. */
  trusted?: readonly Principal.Principal[];
};

/** An in-memory source over explicit lists, which is also the shape tests use. */
export const fromGrants = ({
  grants = [],
  revoked = [],
  members = [],
  consents = [],
  trusted = [],
}: FromGrantsOptions): GrantSource => ({
  get: (id) => Effect.succeed(grants.find((grant) => grant.id === id)),
  grantsFor: (audience) => Effect.succeed(grants.filter((grant) => grant.audience === audience)),
  isRevoked: (id) => Effect.succeed(revoked.includes(id)),
  isMember: (principal, spaceId) =>
    Effect.succeed(members.some((member) => member.principal === principal && member.spaceId === spaceId)),
  ownsSubject: (issuer, subject) => {
    if (trusted.includes(issuer)) {
      return Effect.succeed(true);
    }
    const spaceId = Subject.spaceIdOf(subject);
    if (spaceId === undefined) {
      return Effect.succeed(false);
    }
    if (Principal.spaceIdOf(issuer) === spaceId) {
      return Effect.succeed(true);
    }
    return Effect.succeed(
      members.some(
        (member) => member.principal === issuer && member.spaceId === spaceId && OWNING_ROLES.includes(member.role),
      ),
    );
  },
  consentFor: (grantId, by) =>
    Effect.succeed(consents.find((consent) => consent.grantId === grantId && consent.by === by)),
});

const anyOf = <A>(
  sources: readonly GrantSource[],
  read: (source: GrantSource) => Effect.Effect<A>,
  hit: (value: A) => boolean,
) =>
  Effect.gen(function* () {
    for (const source of sources) {
      const value = yield* read(source);
      if (hit(value)) {
        return value;
      }
    }
    return undefined;
  });

/** Composes sources: grants and revocations are unioned, and a fact holds when any source holds it. */
export const merge = (...sources: readonly GrantSource[]): GrantSource => ({
  get: (id) =>
    anyOf(
      sources,
      (source) => source.get(id),
      (value) => value !== undefined,
    ),
  grantsFor: (audience) =>
    Effect.forEach(sources, (source) => source.grantsFor(audience)).pipe(Effect.map((lists) => lists.flat())),
  isRevoked: (id) => anyOf(sources, (source) => source.isRevoked(id), Boolean).pipe(Effect.map(Boolean)),
  isMember: (principal, spaceId) =>
    anyOf(sources, (source) => source.isMember(principal, spaceId), Boolean).pipe(Effect.map(Boolean)),
  ownsSubject: (issuer, subject) =>
    anyOf(sources, (source) => source.ownsSubject(issuer, subject), Boolean).pipe(Effect.map(Boolean)),
  consentFor: (grantId, by) =>
    anyOf(
      sources,
      (source) => source.consentFor(grantId, by),
      (value) => value !== undefined,
    ),
});

/**
 * Why a check failed, most specific first: a chain that failed only on its policy says more than
 * one that was never a candidate.
 */
export type Reason =
  | { readonly kind: 'no-grant' }
  | { readonly kind: 'subject'; readonly error: SubjectResolutionError }
  | { readonly kind: 'expired' | 'not-yet-valid' | 'revoked'; readonly grantId: string }
  | { readonly kind: 'chain'; readonly grantId: string; readonly detail: string }
  | {
      readonly kind: 'consent';
      readonly grantId: string;
      readonly by: Principal.Principal;
      readonly consentable: boolean;
    }
  | { readonly kind: 'policy'; readonly grantId: string; readonly failed: Policy.FailedPredicate };

const SPECIFICITY: Record<Reason['kind'], number> = {
  'no-grant': 0,
  'subject': 1,
  'not-yet-valid': 2,
  'expired': 2,
  'revoked': 2,
  'chain': 3,
  'consent': 4,
  'policy': 5,
};

export type Allowed = {
  readonly _tag: 'Allowed';
  readonly subject: Subject.Subject;
  /** Leaf first, root last. */
  readonly chain: readonly Grant.Grant[];
  readonly policy: Policy.Policy;
};

export type Denied = { readonly _tag: 'Denied'; readonly subject?: Subject.Subject; readonly reason: Reason };

export type Result = Allowed | Denied;

export const isAllowed = (result: Result): result is Allowed => result._tag === 'Allowed';
export const isDenied = (result: Result): result is Denied => result._tag === 'Denied';

export type CheckOptions = {
  principal: Principal.Principal;
  requirement: Requirement.Requirement;
  args?: unknown;
  caller?: Caller;
  source: GrantSource;
  now?: number;
};

type Walk = { readonly _tag: 'ok'; readonly chain: readonly Grant.Grant[]; readonly policy: Policy.Policy } | Denied;

/** Renders the chain's failure as a one-line sentence for a denial message. */
export const describeReason = (reason: Reason): string => {
  switch (reason.kind) {
    case 'no-grant':
      return 'no grant covers the subject and command';
    case 'subject':
      return reason.error.message;
    case 'expired':
      return `grant ${reason.grantId} has expired`;
    case 'not-yet-valid':
      return `grant ${reason.grantId} is not yet valid`;
    case 'revoked':
      return `grant ${reason.grantId} was revoked`;
    case 'chain':
      return `grant ${reason.grantId}: ${reason.detail}`;
    case 'consent':
      return `grant ${reason.grantId} needs consent from ${reason.by}`;
    case 'policy':
      return `policy failed: ${Policy.describe([reason.failed.predicate])} (got ${JSON.stringify(reason.failed.actual)})`;
  }
};

/**
 * The pure check from the design: resolve the subject, collect candidate grants, walk each proof
 * chain to a root, conjoin the policies along the way with the requirement's own, evaluate over
 * `{ args, caller }`, and answer with the first chain that passes or the most specific failure.
 */
export const check = ({
  principal,
  requirement,
  args,
  caller = {},
  source,
  now = Date.now(),
}: CheckOptions): Effect.Effect<Result> =>
  Effect.gen(function* () {
    let subject: Subject.Subject;
    try {
      subject = Requirement.resolveSubject(requirement, args);
    } catch (error) {
      if (error instanceof SubjectResolutionError) {
        return { _tag: 'Denied', reason: { kind: 'subject', error } } satisfies Denied;
      }
      throw error;
    }
    const target = { subject, command: requirement.command };
    const input: Policy.Input = { args, caller };

    const candidates = [...(yield* source.grantsFor(principal))];
    const spaceId = Subject.spaceIdOf(subject);
    if (
      spaceId !== undefined &&
      Principal.kind(principal) !== 'space' &&
      (yield* source.isMember(principal, spaceId))
    ) {
      candidates.push(...(yield* source.grantsFor(Principal.space(spaceId))));
    }

    let best: Denied = { _tag: 'Denied', subject, reason: { kind: 'no-grant' } };
    const consider = (denied: Denied) => {
      if (SPECIFICITY[denied.reason.kind] >= SPECIFICITY[best.reason.kind]) {
        best = denied;
      }
    };

    for (const candidate of candidates) {
      if (!Grant.covers(candidate, target)) {
        continue;
      }
      const walked = yield* walk(source, candidate, target, subject, now, new Set());
      if (walked._tag === 'Denied') {
        consider(walked);
        continue;
      }
      const consentFailure = yield* checkConsent(source, walked.chain, requirement, now);
      if (consentFailure) {
        consider(consentFailure);
        continue;
      }
      const policy = Policy.conjoin([requirement.policy ?? [], walked.policy]);
      const verdict = Policy.evaluate(policy, input);
      if (verdict._tag === 'Failure') {
        consider({
          _tag: 'Denied',
          subject,
          reason: { kind: 'policy', grantId: candidate.id, failed: verdict.failure },
        });
        continue;
      }
      return { _tag: 'Allowed', subject, chain: walked.chain, policy } satisfies Allowed;
    }
    return best;
  });

const walk = (
  source: GrantSource,
  grant: Grant.Grant,
  target: Pick<Permission.Permission, 'subject' | 'command'>,
  subject: Subject.Subject,
  now: number,
  visited: Set<string>,
  viaSigner = false,
): Effect.Effect<Walk> =>
  Effect.gen(function* () {
    const denied = (reason: Reason): Denied => ({ _tag: 'Denied', subject, reason });
    if (visited.has(grant.id)) {
      return denied({ kind: 'chain', grantId: grant.id, detail: 'proof cycle' });
    }
    visited.add(grant.id);
    const inactive = Grant.inactiveReason(grant, now);
    if (inactive) {
      return denied({ kind: inactive, grantId: grant.id });
    }
    if (yield* source.isRevoked(grant.id)) {
      return denied({ kind: 'revoked', grantId: grant.id });
    }
    const permissions = Grant.covering(grant, target);
    if (permissions.length === 0) {
      return denied({ kind: 'chain', grantId: grant.id, detail: 'does not cover the subject and command' });
    }
    const ownPolicy = Policy.conjoin(permissions.map((permission) => permission.policy ?? [])).filter(
      (predicate) => !viaSigner || Policy.callerOnly([predicate]).length === 0,
    );

    if (!grant.proofs || grant.proofs.length === 0) {
      if (!(yield* source.ownsSubject(grant.issuer, subject))) {
        return denied({ kind: 'chain', grantId: grant.id, detail: `issuer ${grant.issuer} does not own ${subject}` });
      }
      return { _tag: 'ok', chain: [grant], policy: ownPolicy };
    }

    let best: Denied | undefined;
    for (const proofId of grant.proofs) {
      const parent = yield* source.get(proofId);
      if (!parent) {
        best ??= denied({ kind: 'chain', grantId: grant.id, detail: `proof ${proofId} not found` });
        continue;
      }
      if (parent.audience !== grant.issuer) {
        best = denied({ kind: 'chain', grantId: grant.id, detail: `issuer is not the audience of proof ${proofId}` });
        continue;
      }
      if (parent.delegable !== true) {
        best = denied({ kind: 'chain', grantId: grant.id, detail: `proof ${proofId} is not delegable` });
        continue;
      }
      const viaSpace = Principal.kind(parent.audience) === 'space';
      if (viaSpace) {
        const signer = signerOf(grant);
        if (!signer) {
          best = denied({ kind: 'chain', grantId: grant.id, detail: 'issued by a space without a recorded signer' });
          continue;
        }
        const floor = Policy.callerOnly(
          Policy.conjoin(Grant.covering(parent, target).map((entry) => entry.policy ?? [])),
        );
        const verdict = Policy.evaluate(floor, { args: undefined, caller: signer });
        if (verdict._tag === 'Failure') {
          best = denied({
            kind: 'chain',
            grantId: grant.id,
            detail: `signer ${signer.did} (${signer.role}) could not re-grant`,
          });
          continue;
        }
      }
      const walked = yield* walk(source, parent, target, subject, now, new Set(visited), viaSpace);
      if (walked._tag === 'Denied') {
        best = walked;
        continue;
      }
      return { _tag: 'ok', chain: [grant, ...walked.chain], policy: Policy.conjoin([ownPolicy, walked.policy]) };
    }
    return best ?? denied({ kind: 'chain', grantId: grant.id, detail: 'no valid proof' });
  });

const signerOf = (grant: Grant.Grant): Grant.Signer | undefined => {
  const signer = grant.meta?.signer;
  if (signer !== null && typeof signer === 'object' && 'did' in signer && 'role' in signer) {
    const { did, role } = signer;
    if (typeof did === 'string' && typeof role === 'string') {
      return { did, role };
    }
  }
  return undefined;
};

const checkConsent = (
  source: GrantSource,
  chain: readonly Grant.Grant[],
  requirement: Requirement.Requirement,
  now: number,
): Effect.Effect<Denied | undefined> =>
  Effect.gen(function* () {
    for (const grant of chain) {
      if (!grant.consent) {
        continue;
      }
      const consent = yield* source.consentFor(grant.id, grant.consent.by);
      if (!consent || !Consent.isActive(consent, now)) {
        return {
          _tag: 'Denied',
          reason: {
            kind: 'consent',
            grantId: grant.id,
            by: grant.consent.by,
            consentable: requirement.consentable === true,
          },
        } satisfies Denied;
      }
    }
    return undefined;
  });
