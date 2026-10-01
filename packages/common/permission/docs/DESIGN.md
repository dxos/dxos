# Design: Permission system

Status: draft for review, revision 4 (2026-09-30). Project: "Permission system" in the DXOS space;
this file mirrors the design document filed there. Package: `@dxos/permission` (name under
discussion, see Naming).

Revision 4 corrects the check algorithm from review on dxos/dxos#13555: the chain rule compares a
child's issuer with its parent's audience, a candidate grant must cover the requirement's subject
and command, and the requirement's policy is conjoined with the chain's. Revision 3 adds the Overview and the Naming section, and uses 'claim' for what a credential
asserts, all from Rich's comments. Revision 2 folded in Dmytro's: subjects and principals are plain
echo URIs, and a space can be a grant's audience with the role in the policy.

## Overview

**What it is.** One way to say who may do what to which resource, shared by every actor on the
platform: a person at the keyboard, an agent running on their behalf, a process the runtime spawned,
or a whole space's membership. A plugin declares the permissions its features need; a user, an admin
or a parent process grants them; the runtime checks them before an operation runs, whether locally,
in an agent's sandbox or on EDGE. The grant is a serializable record that travels with the thing it
authorises, so the check needs no server.

**Why now.** Agents make the problem concrete. An agent that can send email, run code in a sandbox
and write to spaces needs bounds a user can read and consent to, and those bounds have to survive
the hop from the user's device to the runtime that executes the agent. Today each seam has its own
answer: space membership roles in HALO, hand-written allow and deny lists for the Claude agent,
scopeless API tokens on the hub, a process environment that carries a space id and nothing else.
None of them can express 'this agent may send email from this mailbox to our own domain for the
next week', and none of them can be handed to a child process attenuated. This design gives those
seams one vocabulary and one evaluator, so a permission granted in Composer is the same object a
sandbox on EDGE enforces.

**What it is not.** Not a replacement for space membership, which stays the source of truth for who
is in a space. Not a new identifier scheme: resources are echo URIs and principals are HALO DIDs.
Not an authentication system: it decides what a verified principal may do, and HALO decides who
they are.

## TL;DR

Adopt UCAN's model. A permission is a triple **(subject, command, policy)**: what resource, what
verb, under what constraints. Authority originates with whoever owns the subject and flows to
principals through **grants** that can only narrow it. An operation, tool or plugin declares what it
**requires**; a pure `check` function decides from the principal's grants.

We depart from UCAN in three places:

1. **Principals are users, agents, processes and spaces.** Processes have no keys, so grants to a
   process are attested by the runtime that spawned it rather than signed. A grant to a space is
   held by every member, and its policy says which roles. The payload is identical everywhere, so
   one DSL serves all of it.
2. **The store is HALO and ECHO, not a token-passing protocol.** A signed grant is a HALO credential
   whose claim is the grant, so peers and EDGE verify it with keys they already resolve.
3. **Space membership stays the source of truth for space access.** Roles are derived into grants
   at check time (a Zanzibar-style rewrite), never duplicated.

The package is the DSL and evaluator only: schemas, canonical serialization, `covers`, `attenuate`,
`check`. No crypto, no ECHO, no services. Everything above it (process tree, agents, membership,
plugins, EDGE) consumes it.

## Naming

Rich: the name is not settled. It would be 'credentials' if HALO did not already own that word;
'claims' is a candidate.

How the words line up with HALO and the W3C Verifiable Credentials vocabulary HALO follows:

| This document           | HALO / VC term                   | Meaning                                          |
| ----------------------- | -------------------------------- | ------------------------------------------------ |
| grant                   | credential                       | a signed record from an issuer about a subject   |
| the grant's permissions | claim (`credentialSubject`)      | what the credential asserts about its subject    |
| permission              | one claim                        | (subject, command, policy)                       |
| requirement             | none                             | what an operation asks the checker to find       |
| check                   | verification + policy evaluation | is there a valid chain, and does the policy hold |

So a signed grant is a HALO credential whose claim is a set of permissions, and a permission is a
claim about a resource. Two options for the package:

1. **`@dxos/permission`, separate.** Pure, no crypto, usable by the process runtime and EDGE
   without pulling HALO in. Depends on `@dxos/keys` only. This is what the rest of the document
   assumes.
2. **Inside `@dxos/credentials`.** The grant becomes a first-class credential type there, next to
   `SpaceMember`. Tighter, but it drags the credential state machine and protobuf into every
   checker, including the process runtime and EDGE workers that today do not link HALO.

Recommendation: keep the evaluator separate, and pick a name that reads as the claim rather than
the envelope. Candidates: `@dxos/permission`, `@dxos/claims`, `@dxos/authz`. Decision pending Rich;
recorded as open question 5.

## Requirements

From the brief:

- Shared across users, processes and agents.
- Permissions are granted and required.
- Open: plugins define their own permissions.
- Serializable.
- Actions are local and remote: sandbox access, sending email, reading and writing spaces,
  spawning processes.
- Integrated with the process tree, Agents and space members.
- A low-level package for the DSL and serialization.

Derived from the platform:

- **Offline-first.** A check must not need a server round trip. That rules out a central ACL
  service (Zanzibar) and favours self-contained grants with proof chains (UCAN, Biscuit).
- **Monotonic attenuation.** A delegate never holds more than its delegator. Every system surveyed
  agrees on this; SPKI's delegation bit and UCAN's chain rules are the reference.
- **Displayable.** A user reads a grant in Composer and consents to it (the Android and Chrome
  extension prompt model). The policy language has to be small and declarative, not a logic
  program.
- **Verifiable by EDGE.** Functions, sandboxes and replication are enforced server-side from the
  same grant bytes the client holds.
- **Nothing new to name things.** Resources and principals are addressed with the URIs the
  platform already has (`echo://`, `did:halo:`); the permission system invents no identifier
  scheme.

## Prior art

| System           | Principal          | Authority root               | Attenuation                                               | Policy language                                              | Format                          | Online?         | We take                                                                                                                  |
| ---------------- | ------------------ | ---------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| UCAN 1.0         | DID                | the subject (resource owner) | signed delegation chain, commands narrow by prefix        | predicate tree over args (`==`, `like`, `and`, `any`, ...)   | DAG-CBOR envelope, CID proofs   | no              | the triple, command hierarchy, policy language, chain rules, revocation record                                           |
| Biscuit          | public key         | authority block              | append-only blocks add checks; later blocks cannot widen  | Datalog facts, rules, checks                                 | binary, signed per block        | no              | block scoping as our policy-conjunction rule; facts about the caller as the check context; third-party blocks as consent |
| Macaroons        | bearer             | shared root key              | anyone appends caveats (HMAC chain)                       | first-party caveats; third-party discharge                   | opaque bytes                    | discharges only | first-party caveat = policy; third-party caveat = consent record                                                         |
| Zanzibar         | user or userset    | relation tuples              | none (central evaluation)                                 | userset rewrites (union, computed, tuple-to-userset)         | tuples in a global store        | yes             | derived grants from relationships; `expand` for the who-can-do-what UI                                                   |
| SPKI/SDSI        | public key or name | issuer                       | delegation bit; certificate chain reduction               | 5-tuple (issuer, subject, delegate, authorization, validity) | S-expressions                   | no              | the 5-tuple as the mental model; a name standing for a group is our space-as-audience                                    |
| HALO credentials | HALO key, DID      | space genesis, identity      | `parent_credential_ids`; state machine resolves conflicts | claims (`SpaceMember.role`, ...)                             | protobuf `Credential` + `Proof` | no              | the signed envelope and the store                                                                                        |

### UCAN 1.0

A delegation carries `iss`, `aud`, `sub`, `cmd`, `pol`, `nonce`, `nbf`, `exp`. Commands are
`/`-separated paths and a shorter path proves its descendants, so `/crud` covers `/crud/read`.
Policies are predicate trees over the invocation's `args` using jq-like selectors: comparison
(`==`, `!=`, `<`, `<=`, `>`, `>=`), glob (`like`), connectives (`and`, `or`, `not`) and quantifiers
(`all`, `any`). An invocation carries `prf`, the chain of delegation ids from the invoker back to
the subject; every hop's `aud` must equal the next hop's `iss`, time windows must all hold, and
every signature must verify. `sub: null` is a 'powerline': the delegation applies to whatever
subjects the delegator later holds. Commands are openly extensible: each service defines its own
under its namespace, and only `/ucan` is reserved. Revocation is a separate signed record naming
the delegation id.

What we leave: the DAG-CBOR and varsig envelope, CID proofs, and the requirement that every
principal is a `did:key`. Our determinism comes from canonical JSON and our envelope is the HALO
credential.

### Biscuit

A token is an authority block plus appended attenuation blocks, each signed. Policy is Datalog:
facts, rules, `check if` conditions, `allow`/`deny` policies. Facts from a later block are not
visible to earlier blocks, which is what stops an appended block from escalating. Third-party
blocks are signed by an external key. Biscuit is the most expressive of the set, and that is also
its cost: it needs a Datalog engine everywhere a check runs, and a policy is hard to render for a
user's consent.

What we take: the scoping rule (every hop's policy is conjoined, so a delegate can add constraints
and never remove one) and the idea that the authorizer supplies facts about the caller. Our check
context carries the caller's membership role, so a policy can constrain on it.

### Macaroons

An HMAC chain over a root secret. Anyone holding the token can append a first-party caveat (a
predicate the target checks) or a third-party caveat (a predicate a named service must discharge
with its own macaroon). Cheap and offline, but bearer: possession is authority, there is no issuer
binding, and the root key is a shared secret.

What we take: the third-party caveat. A grant may carry a `consent` condition that is satisfied
only alongside a separate record signed by the named principal, which is exactly a user's consent
prompt.

### Zanzibar

A global store of relation tuples `object#relation@user`, namespace configs with userset rewrites
(union, computed userset, tuple-to-userset), and `check`, `expand` and `read` APIs, with zookies
for external consistency. Open-source successors: SpiceDB, OpenFGA, Ory Keto.

What we take: permissions derived from relationships rather than stored. Space membership is the
relation; the rewrite yields grants. `expand` is the shape of the UI question 'who can do this to
this space'. What we leave: the central service. ECHO's causal consistency stands in for zookies.

### SPKI/SDSI (RFC 2693)

An authorization certificate is a 5-tuple (issuer, subject, delegation, authorization, validity).
Chains reduce by tuple reduction: the result of a chain is the intersection of authorizations, the
conjunction of validities, and delegation is permitted only while every non-leaf has the bit set.
SDSI name certificates bind local names to keys and let a name stand for a group. UCAN is its
direct descendant.

What we take: the reduction as the specification of `check`, and a name standing for a group,
which for us is a space standing for its members.

### HALO credentials (in-house)

`Credential { issuer, issuance_date, expiration_date, subject: Claim, proof, parent_credential_ids }`,
where the claim carries a typed value such as `SpaceMember { space_key, role }` with role OWNER,
ADMIN, EDITOR, READER or REMOVED. `member-state-machine.ts` already enforces that only an ADMIN or
OWNER can change a role and resolves concurrent branches. The process runtime already fixes a
`Process.Environment` at spawn and inherits it into children. `AgentIdentity` already scopes a DID
over an operation call. `agent-claude` holds hand-written allow and deny tool rules.

What we take: all of it. The credential is our signed envelope and store, the environment is where
attested grants live, the DID is the agent principal, and the tool rules become derived from
grants.

## Model

### Naming: echo URIs only

Everything a permission points at is named with a URI the platform already has. Nothing new is
invented.

| Thing                          | URI                                  | Notes                                                                                                             |
| ------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| a space                        | `echo://<spaceId>`                   | the space itself, as a subject or as an audience                                                                  |
| an object                      | `echo://<spaceId>/<objectId>`        | a document, a mailbox, a sandbox, a plugin record, an agent                                                       |
| an identity (user or agent)    | `did:halo:<id>`                      | key-backed                                                                                                        |
| a process                      | `echo://<spaceId>/<processObjectId>` | the process record the runtime keeps in the space; app-level processes with no space use the runtime's own record |
| every subject the issuer holds | `*`                                  | UCAN's powerline, resolved against the issuer's grants at check time                                              |

A service like email or a sandbox is not a new kind of name: it is the object that represents it
(the mailbox, the sandbox object, the access-token record), and the command carries the verb. So
'send email through this mailbox' is subject `echo://<spaceId>/<mailboxId>`, command
`/email/send`.

### Principals

A principal is who holds a grant (its audience) or issues one (its issuer). Three kinds:

- **Identity** `did:halo:<id>`: a user or an agent. Key-backed; grants to it are signed.
- **Process** `echo://<spaceId>/<processId>`: not key-backed; grants to it are attested by the
  runtime that spawned it.
- **Space** `echo://<spaceId>`: a grant whose audience is a space is held by every member of that
  space. The policy narrows it by role through the check context (`.caller.role`), so 'editors of
  this space' is audience `echo://<spaceId>` with policy
  `['in', '.caller.role', ['editor', 'admin', 'owner']]`. This replaces group principals: no
  `#members`, no `#role:` suffixes.

### Subject

The resource the permission is about, as an echo URI (table above). A subject covers another when
it is the same URI, or when it is a space and the other is an object in that space. `*` covers
whatever the issuer's own grants cover.

### Command

A `/`-separated path. A prefix covers its descendants and `/` covers everything. Core reserves
`/space/{read,write,admin}`, `/object/{read,write,delete}`, `/process/{spawn,signal,inspect}`,
`/agent/{run,configure}`, `/permission/{grant,revoke}` and `/credential/read`. A plugin owns
`/<plugin-short-name>/...`, for example `/email/send`, `/sandbox/exec`, `/calendar/write`.
Commands are registered (see Plugins) so the UI can label them, but an unregistered command still
checks.

### Policy

UCAN's predicate language plus one addition: comparison (`==`, `!=`, `<`, `<=`, `>`, `>=`), set
membership (`in`), glob (`like`), connectives (`and`, `or`, `not`), quantifiers (`all`, `any`),
with jq-like selectors. Selectors read the check input, which has two roots: `.args` for the
operation's arguments and `.caller` for facts the runtime asserts about the invoker
(`.caller.did`, `.caller.role` in the subject's space, `.caller.process`). A policy is an array of
predicates and is a conjunction. Examples, written with single quotes for readability (the wire
form is JSON):

```
['like', '.args.to', '*@dxos.org']
['<=', '.args.attachments.length', 3]
['any', '.args.recipients', ['==', '.role', 'member']]
['in', '.caller.role', ['editor', 'admin', 'owner']]
```

Chosen over Datalog because it is JSON, needs no engine, renders as a sentence for consent, and
matches a published spec.

### Permission

```ts
type Permission = { subject: string; command: string; policy?: Policy[] };
```

### Grant

```ts
type Grant = {
  id: string; // base58(sha256(canonical payload)); revocations and proofs name it
  issuer: Principal;
  audience: Principal; // always bound: there are no bearer grants
  permissions: Permission[];
  proofs?: string[]; // ids of the grants that authorise the issuer; empty when the issuer owns the subject
  notBefore?: number; // ms since epoch
  expiresAt?: number;
  delegable?: boolean; // SPKI delegation bit; false means invoke only, never re-grant
  consent?: { by: Principal; scope?: 'once' | 'session' | 'standing' }; // third-party caveat
  meta?: Record<string, unknown>; // unsigned
};
```

Two envelopes carry the same payload:

- **Signed.** The `Grant` is the claim (`credentialSubject`) of a HALO `Credential`, signed by the
  issuer's device key. Grants to an identity live in that identity's HALO feed; grants about a
  space's subjects, and grants whose audience is the space, live in the space control feed next to
  `SpaceMember`. Verifiable wherever HALO keys resolve, including EDGE.
- **Attested.** The `Grant` is held in the process runtime's process table as part of
  `Process.Environment`. The issuer is the parent process or the identity that spawned the root;
  the audience is the child process. It never leaves the runtime except to a remote runtime the
  local one already trusts, where it travels with the spawn over the authenticated channel.

### Requirement

```ts
type Requirement = { command: string; subject?: string | Selector; policy?: Policy[]; consentable?: boolean };
```

Declared on an operation, a tool, a plugin manifest (`permissions.required`) or an RPC. `subject`
is either a fixed URI or a selector that picks the resource out of the args (`.args.mailbox`
resolves a ref to its `echo://` URI). `consentable` says the requirement may be satisfied by asking
the user at invocation time rather than failing.

### Check

```
check({ principal, requirement, args, caller, source }) -> Allowed { chain } | Denied { reason }
```

Pure, and the specification of the package:

1. Resolve the subject from the requirement and the args.
2. Candidates are the grants whose audience is the principal, or the space of the subject when the
   principal is a member of it, inside their time window, not revoked, and holding at least one
   permission that covers the resolved subject and the requirement's command. A grant for
   `/email/send` never satisfies a requirement for `/sandbox/exec`.
3. For each candidate, walk `proofs` to a root, where a root is a grant whose issuer owns the
   subject: an OWNER or ADMIN for a space or an object in it, the identity itself for its own
   resources, the runtime for a process. At every hop the child's issuer equals the parent's
   audience (the delegate re-grants what it was granted), the child's command is a descendant of
   the parent's, the child's subject is covered by the parent's, every non-leaf is `delegable`,
   and the time windows intersect.
4. Conjoin the requirement's own policy with every policy on the chain and evaluate the result
   over `{ args, caller }`. A later hop can add a constraint and never remove one, and the
   requirement's policy is the operation's floor that no grant can lift.
5. If a `consent` condition is present, require a matching `Consent` record from the named
   principal.
6. The first chain that passes is the answer, returned with the chain for tracing and audit. None
   passing is `Denied` with the most specific reason found (no grant, expired, revoked, policy
   failed with the predicate that failed, consent missing).

`covers(grant, permission)` and `attenuate(parentGrants, requested) -> Grant | AttenuationError`
are the helpers spawn and delegation UIs use; `attenuate` is the only way to mint a child grant and
refuses anything the parent does not cover.

**Signing on behalf of a space.** A space has no key of its own, so when a parent grant's audience
is `echo://<spaceId>` the chain rule makes the child's issuer the space while a member's device key
does the signing. The child is a HALO credential whose `issuer` is the space key and whose `Proof`
is signed by a device; HALO already resolves such a proof through the device's chain of
`AuthorizedDevice` credentials to an identity. `attenuate` and `check` then require, at the child's
issuance time, that the identity was a `SpaceMember` of that space and that its role satisfied the
parent grant's policy (an `/space` grant delegable to admins and owners cannot be re-granted by an
editor). The signing identity and role are recorded in the child's `meta` for audit, but the
authority is the space's, so revoking the member later revokes what they signed only through the
normal revocation path, never silently.

### Derived grants

A `GrantSource` is an interface, not a store, so grants can be computed. The membership source
yields one grant per space, audience `echo://<spaceId>`, issued by the space itself, with
`/space/read` for every role, `/space/write` with policy
`['in', '.caller.role', ['editor', 'admin', 'owner']]`, and `/space` delegable with policy
`['in', '.caller.role', ['admin', 'owner']]`. Nothing in `SpaceMember` changes. Sources compose,
and a plugin can add one (project members hold `/object/write` on the project's documents).
Enumerating a source for a subject is Zanzibar's `expand` and backs the who-can-do-what view.

### Revocation

`Revocation { grantId, issuer, reason? }`, signed by the issuer of that grant or of any ancestor in
its chain, stored next to the grant. `check` treats a revoked grant as absent. Concurrent grant and
revoke resolve with the credential state machine's existing rules, which already handle the same
shape for `SpaceMember`.

### Serialization

- Canonical JSON: keys sorted, no whitespace, UTF-8, timestamps as integer milliseconds.
  `id = base58(sha256(canonical))`.
- Effect Schema for every type; `Schema.encode` and `Schema.decode` are the only entry points, so
  the DSL is the schema.
- Wire: the canonical JSON as the claim of a HALO `Credential` for signed grants; the decoded object
  inside `Process.Environment` for attested ones. CBOR is not needed because canonical JSON already
  gives determinism.

## TypeScript DSL

What a plugin author, an operation author and the runtime write. Everything in the package is
pure; signing and storage are the callers' job. Module paths below say `@dxos/permission` pending
the naming decision.

### Defining a permission (plugin side)

```ts
import { Permission } from '@dxos/permission';

export const SendEmail = Permission.define({
  command: '/email/send',
  name: 'Send email',
  description: 'Send email through a mailbox in this space.',
  icon: 'ph--paper-plane-tilt--regular',
  consentable: true,
});

export const ExecSandbox = Permission.define({
  command: '/sandbox/exec',
  name: 'Run code in a sandbox',
});
```

A definition is metadata for the registry and the UI; the command string is what checks. A plugin
manifest lists `permissions.defines: [SendEmail, ExecSandbox]`.

### Requiring it on an operation

```ts
import { Requirement } from '@dxos/permission';

export const sendEmail = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.email.send'), name: 'Send email' },
  input: Schema.Struct({ mailbox: Ref.Ref(Mailbox), to: Schema.String, body: Schema.String }),
  output: Schema.Void,
  permissions: [Requirement.make(SendEmail, { subject: Requirement.arg('mailbox') })],
});
```

`permissions` is sugar for `Permission.Required.set([...])` on `meta.annotations`, so it serializes
with the operation record and a remote invoker sees the same requirement. `Requirement.arg('mailbox')`
reads the ref out of the input and turns it into the mailbox's `echo://` URI at check time. A fixed
subject is `Requirement.make(ExecSandbox, { subject: 'echo://<spaceId>' })`.

### Building permissions and policies

```ts
import { Permission, Policy, Subject } from '@dxos/permission';

const sendToDxos = Permission.make({
  subject: Subject.of(mailbox), // echo://<spaceId>/<mailboxId>; Subject.space(spaceId) for the whole space
  command: SendEmail.command,
  policy: [Policy.like('.args.to', '*@dxos.org'), Policy.lte('.args.attachments.length', 3)],
});

const editorsWrite = Permission.make({
  subject: Subject.space(spaceId),
  command: '/space/write',
  policy: [Policy.within('.caller.role', ['editor', 'admin', 'owner'])],
});
```

`Policy.*` builders return the JSON predicate arrays (`within` builds the `in` predicate, since
`in` is a reserved word); `Policy.evaluate(policy, { args, caller })` returns
`Result.succeed(true)` or `Result.fail(FailedPredicate)` naming the predicate, the path and the
actual value; `Policy.describe(policy)` renders '.args.to matches \*@dxos.org and
.args.attachments.length is at most 3' for the consent prompt. `Policy.conjoin` flattens the
policies of a chain into one conjunction, and `Policy.callerOnly` keeps the predicates that read
only `.caller`, which is what can be judged at issuance time without arguments.

### Granting

```ts
import { Grant, Principal } from '@dxos/permission';

const toAgent =
  yield *
  Grant.make({
    issuer: Principal.identity(me.did),
    audience: Principal.identity(agent.did),
    permissions: [sendToDxos],
    expiresAt: Grant.inDays(7),
    delegable: false,
  });

// Outside the package: HALO signs the canonical bytes and stores the credential.
const credential = yield * PermissionCredentials.issue(toAgent); // @dxos/credentials
```

`Grant.make` is an Effect because it fills `id` from the sha256 of the canonical form (WebCrypto is
async). `Grant.canonical(grant)` is the byte string HALO signs, `Grant.verifyId` catches a tampered
payload before any signature check, and `Grant.encode` and `Grant.decode` are the Effect Schema
entry points. `Grant.isActive(grant, now)` and `Grant.covers(grant, { subject, command })` are the
two predicates `check` is built from.

### Attenuating

```ts
const forChild =
  yield *
  Grant.attenuate(parentEnvironment.grants, {
    audience: Principal.process(childProcess),
    permissions: [Permission.make({ subject: Subject.space(spaceId), command: '/space/read' })],
    expiresAt: Grant.inMinutes(30),
  });
// fails with AttenuationError when the parent grants do not cover the request
```

`attenuate` conjoins each parent's policy onto the child's permission, shrinks the child's window
to the parent's, records the parents as `proofs`, and refuses a parent that is not `delegable` or
not inside its window. When a parent is held by a space, the call takes `{ signer: { did, role } }`,
judges the parent's caller predicates against that signer, records the signer in the child's `meta`,
and leaves those predicates off the child: they bound the member who signed, not the holder.

### Checking

```ts
import { Check } from '@dxos/permission';

const source = Check.merge(membershipSource, credentialSource, Check.fromGrants({ grants: environment.grants }));

const result =
  yield *
  Check.check({
    principal: Principal.identity(agent.did),
    requirement: sendEmail.permissions[0],
    args: input,
    caller: { did: agent.did, role: 'editor' },
    source,
  });

if (Check.isDenied(result)) {
  return yield * new PermissionDeniedError({ context: { requirement, reason: Check.describeReason(result.reason) } });
}
```

`Allowed` carries the resolved subject, the chain (leaf first) and the conjoined policy that
passed, for tracing and audit. `Denied` carries a `Reason`, the most specific one found across the
candidates: `no-grant`, `subject` (the selector resolved to nothing), `not-yet-valid`, `expired`,
`revoked`, `chain` (a hop broke the issuer/audience, delegable, signer or ownership rule, with the
detail), `consent` (who still has to consent, and whether the requirement is `consentable`), or
`policy` with the predicate that failed and the value it saw.

`GrantSource` is the interface the evaluator reads through:

```ts
interface GrantSource {
  get(id: string): Effect<Grant | undefined>;
  grantsFor(audience: Principal): Effect<readonly Grant[]>;
  isRevoked(id: string): Effect<boolean>;
  isMember(principal: Principal, spaceId: string): Effect<boolean>;
  ownsSubject(issuer: Principal, subject: Subject): Effect<boolean>;
  consentFor(grantId: string, by: Principal): Effect<Consent | undefined>;
}
```

`Check.fromGrants({ grants, revoked, members, consents, trusted })` is the in-memory source over
explicit lists (a space owns its subjects, so do its `owner` and `admin` members, and a `trusted`
principal such as the process runtime roots a grant for any subject); it is what the tests use.
`Check.merge(...sources)` unions grants and answers a fact when any source does.

The package's `Check.test.ts` is the executable form of the check rules above: one scenario per
way a check passes or fails (policy glob, wrong command, foreign subject, wrong principal, expired,
not yet valid, revoked at the leaf or at the root, issuer not an owner, requirement floor, space
audience by role, member versus non-member, chain narrowing hop by hop, non-delegable hop, inverted
issuer, missing proof, admin versus editor signing for a space, forged space child, consent
missing, present, expired or by the wrong principal, runtime-rooted process environment, merged
sources).

## Interfaces

### Operations

Three touch points, all in `@dxos/compute`:

1. **Declaration.** `Operation.make` accepts `permissions: Requirement[]` and stores it in
   `meta.annotations` under `Permission.Required`. It survives `Operation.toRecord` and
   `Operation.fromRecord`, so a persisted or remote operation carries its requirements.
2. **Enforcement before dispatch.** `OperationInvoker` and `ProcessOperationInvoker` run every
   requirement through `Check.check` before calling the handler. The principal and the caller facts
   come from the process environment (below), or from `AgentIdentity` when an agent invokes
   directly. A denial is a typed `PermissionDeniedError` that names the requirement and the nearest
   grant, and is written to the trace as a `permission.denied` span event. A `consentable` denial
   is instead raised as `ConsentRequired`, which the harness turns into a prompt and retries on a
   `Consent`.
3. **Inside a handler.** For a subject that is only known mid-handler,
   `yield* Permission.require(SendEmail, { subject: Subject.of(mailbox) })` runs the same check
   against the current process's grants. `yield* Permission.grant({...})` mints an attenuated grant
   to hand to a child process or another principal; it refuses anything the current grants do not
   cover.

Tool exposure to an agent is the list of operations whose requirements `check` allows, evaluated
once per session and re-evaluated when grants change; `consentable` operations stay listed.

### Processes

- `Process.Environment` gains `grants: readonly Grant[]` and
  `caller: { did?: string; role?: SpaceMember.Role; process: string }`, both fixed at spawn and
  inherited by children.
- `SpawnOptions.grants` is what the parent requests for the child. `ProcessManager.spawn` calls
  `Grant.attenuate(parent.environment.grants, requested)` and refuses to spawn on
  `AttenuationError`; a child never holds more than its parent. Omitting `grants` inherits the
  parent's set with the audience rewritten to the child.
- The root process of a user session gets the identity's signed grants plus the
  membership-derived grants. An agent's root process gets `attenuate(agent.grants, sessionRequest)`.
- `PermissionService` is a `BaseServices` member the runtime provides from the environment:
  `PermissionService.check(requirement, args)`, `PermissionService.grants`,
  `PermissionService.principal`. `Permission.require` and `Permission.grant` above are its two
  verbs.
- `RemoteProcessManager` sends the child's grants with the spawn over the authenticated channel;
  the EDGE runtime re-runs `attenuate` and `check` against its own view rather than trusting the
  client's result.
- `ProcessMonitor` shows a process's grants next to its trace, so a denied call is one click from
  the grant that would have allowed it.

## Integration

### Agents (M4)

- `Agent.grants` holds the grants a user issued to the agent's DID, signed by the user's device
  key. `AgentIdentity` is the principal during a call.
- A session spawns the agent's process with `attenuate(agentGrants, sessionRequest)`.
- The tool list is the operations whose requirements `check` allows. An unmet requirement withholds
  the tool unless it is `consentable`, in which case the tool is offered and the invocation blocks
  on a `Consent`: Composer prompts, the user signs a one-shot grant with the exact policy and a
  short `expiresAt`, and the invocation resumes. This replaces the hand-written allow and deny rules
  in `agent-claude`, which become compiled from grants.

### Space members (M4)

- Derived grants as above; nothing changes in `SpaceMember` for v1.
- Later, per-object grants are `PermissionGrant` credentials in the control feed, and the
  subduction policy hooks (`authorizeFetch`, `authorizePut`) and EDGE db-service call `check` for
  replication.

### Plugins (M5)

- `Permission.define` in the package. A plugin manifest lists `permissions.defines` and
  `permissions.required`. An app-framework capability `Permission.Registry` collects the definitions
  so the UI resolves a command to a label and description.
- Composer: a Permissions panel on a space (expand: who can do what), on an Agent (its grants, with
  grant and revoke), and the consent dialog.

### EDGE (M5)

- functions-service and operation-service verify signed grants with HALO keys and enforce the
  operation's requirements on invoke. `/sandbox/exec` on the sandbox object gates sandbox creation,
  `/email/send` on the mailbox gates the messenger. Hub API tokens (`dx-api01-...`), which have no
  scopes today, express scopes as `Permission[]`.

## Package layout

`packages/common/permission` (name pending), `private: true`. Dependencies: `effect`, `@dxos/keys`, and
a sha256 (`@dxos/crypto` or WebCrypto) when grant ids arrive. No ECHO, no HALO, no Effect
services beyond the `GrantSource` interface.

Modules, namespace-exported per the code-style skill: `Principal`, `Subject`, `Command`, `Policy`
(schema, builders, `evaluate`, `describe`), `Permission` (schema, `make`, `define`, the `Required`
annotation), `Grant` (schema, `make`, canonical form, id, `attenuate`), `Requirement`,
`Revocation`, `Consent`, `Check` (`covers`, `check`, `GrantSource`), `errors`.

## Decisions

1. The UCAN triple, not roles or ACLs. Roles remain only as the membership relation that derives
   grants, and as a `.caller.role` fact a policy can test.
2. Policy is UCAN's predicate language (plus `in`), not Datalog.
3. Two envelopes, one payload: signed for identities and spaces, attested for processes.
4. Membership is derived at check time, never copied into stored grants.
5. Audience is always bound. There are no bearer grants. A space as audience means its members.
6. Canonical JSON with a hash id; no CBOR or CID.
7. The package holds no crypto and no services; signing is HALO's job.
8. Subjects and principals are echo URIs and HALO DIDs. No new identifier kinds. (Dmytro,
   2026-09-30.)
9. No group principals: a space is the audience and the role goes in the policy. (Dmytro,
   2026-09-30.)
10. A signed grant is a HALO credential; its permissions are the credential's claim. The vocabulary
    follows HALO and Verifiable Credentials: 'claim', not 'assertion'. (Rich, 2026-09-30.)

## Open questions

1. Where signed grants live: the HALO identity feed, the space control feed, or an ECHO object.
   Feeds are what EDGE verifies today; ECHO objects are what the UI edits.
2. Should `delegable` default to true (UCAN) or false (safer for agents)?
3. Consent lifetime: once, session or standing. Does the requirement decide, or the user at the
   prompt?
4. A process's URI: is the runtime's process record an ECHO object in the space (so
   `echo://<spaceId>/<processId>` is real), or does an app-level process with no space need the
   runtime to hold the record?
5. The name, and whether the package stands alone or joins `@dxos/credentials`. See Naming.
   (Rich.)

## Sources

- UCAN core: https://github.com/ucan-wg/spec
- UCAN delegation: https://github.com/ucan-wg/delegation
- UCAN invocation: https://github.com/ucan-wg/invocation
- Biscuit Datalog reference: https://doc.biscuitsec.org/reference/datalog
- Biscuit introduction (Clever Cloud):
  https://www.clever-cloud.com/blog/engineering/2021/04/12/introduction-to-biscuit/
- Macaroons (Birgisson et al., NDSS 2014):
  https://research.google/pubs/macaroons-cookies-with-contextual-caveats-for-decentralized-authorization-in-the-cloud/
- Zanzibar: https://en.wikipedia.org/wiki/Google_Zanzibar
- SPKI certificate theory, RFC 2693: https://www.rfc-editor.org/rfc/rfc2693
- W3C Verifiable Credentials data model (credentialSubject, claims): https://www.w3.org/TR/vc-data-model/
- HALO credentials: `packages/core/protocols/src/proto/dxos/halo/credentials.proto`,
  `packages/core/halo/credentials/src/state-machine/member-state-machine.ts`
- Process environment: `packages/core/compute/compute/src/Process.ts`,
  `packages/core/compute/compute-runtime/src/ProcessManager.ts`
