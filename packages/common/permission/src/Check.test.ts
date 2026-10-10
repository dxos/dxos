//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Check from './Check.ts';
import * as Consent from './Consent.ts';
import { AttenuationError } from './errors.ts';
import * as Grant from './Grant.ts';
import * as Permission from './Permission.ts';
import * as Policy from './Policy.ts';
import * as Principal from './Principal.ts';
import * as Requirement from './Requirement.ts';
import * as Subject from './Subject.ts';

const NOW = 1_800_000_000_000;
const SPACE_ID = 'BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA';
const MAILBOX_ID = '01M3RV5KJ2RYBB3ERY7R9MN1WG';
const OTHER_SPACE_ID = 'CZ3Q5XYK2TNA7MBPWQ6DRJ4HSE5VGUF2B';

const alice = Principal.identity('did:halo:ALICE');
const bob = Principal.identity('did:halo:BOB');
const agent = Principal.identity('did:halo:AGENT');
const space = Principal.space(SPACE_ID);
const runtime = Principal.identity('did:halo:RUNTIME');
const childProcess = Principal.process(`echo://${SPACE_ID}/01PROCESS`);

const mailbox = Subject.object(SPACE_ID, MAILBOX_ID);

const SendEmail = Permission.define({ command: '/email/send', name: 'Send email', consentable: true });

const sendEmail = Requirement.make(SendEmail, { subject: Requirement.arg('mailbox') });
const writeSpace = Requirement.make('/space/write', { subject: Requirement.arg('space') });

const run = <A>(effect: Effect.Effect<A, unknown>) => EffectEx.runPromise(effect);

const check = (options: Omit<Check.CheckOptions, 'now'> & { now?: number }) =>
  run(Check.check({ now: NOW, ...options }));

/** Alice owns the space, so her grant is a root; the agent may send only to dxos.org. */
const agentMayEmailDxos = () =>
  Grant.make({
    issuer: alice,
    audience: agent,
    permissions: [
      Permission.make({ subject: mailbox, command: '/email/send', policy: [Policy.like('.args.to', '*@dxos.org')] }),
    ],
    expiresAt: Grant.inDays(7, NOW),
  });

const sourceWith = (options: Check.FromGrantsOptions) =>
  Check.fromGrants({ members: [{ spaceId: SPACE_ID, principal: alice, role: 'owner' }], ...options });

describe('Check', () => {
  describe('a direct grant', () => {
    test('passes when the subject, command and policy all hold', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox: { '/': mailbox }, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [grant] }),
      });
      expect(Check.isAllowed(result)).toBe(true);
      if (Check.isAllowed(result)) {
        expect(result.chain.map((link) => link.id)).toEqual([grant.id]);
        expect(result.subject).toBe(mailbox);
      }
    });

    test('fails on the policy when the recipient is outside the glob', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox: { '/': mailbox }, to: 'someone@example.com' },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'policy', failed: { path: '.args.to', actual: 'someone@example.com' } },
      });
      if (Check.isDenied(result)) {
        expect(Check.describeReason(result.reason)).toContain('.args.to matches *@dxos.org');
      }
    });

    test('fails when the command is not covered', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: Requirement.make('/sandbox/exec', { subject: mailbox }),
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'no-grant' } });
    });

    test('fails when the subject is a different object', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox: Subject.object(SPACE_ID, '01OTHERMAILBOX'), to: 'rich@dxos.org' },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'no-grant' } });
    });

    test('fails for a principal the grant was not issued to', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: bob,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'no-grant' } });
    });

    test('fails once the grant has expired', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [grant] }),
        now: Grant.inDays(8, NOW),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'expired', grantId: grant.id } });
    });

    test('fails before notBefore', async ({ expect }) => {
      const grant = await run(
        Grant.make({
          issuer: alice,
          audience: agent,
          permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
          notBefore: Grant.inHours(1, NOW),
        }),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'not-yet-valid' } });
    });

    test('fails once the grant is revoked', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [grant], revoked: [grant.id] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'revoked', grantId: grant.id } });
    });

    test('fails when the issuer does not own the subject', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: Check.fromGrants({
          grants: [grant],
          members: [{ spaceId: SPACE_ID, principal: alice, role: 'editor' }],
        }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'chain', grantId: grant.id } });
    });

    test('a space-wide grant covers every object in the space', async ({ expect }) => {
      const grant = await run(
        Grant.make({
          issuer: alice,
          audience: agent,
          permissions: [Permission.make({ subject: Subject.space(SPACE_ID), command: '/email' })],
        }),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox },
        source: sourceWith({ grants: [grant] }),
      });
      expect(Check.isAllowed(result)).toBe(true);
    });

    test('a grant for one space never reaches another', async ({ expect }) => {
      const grant = await run(
        Grant.make({
          issuer: alice,
          audience: agent,
          permissions: [Permission.make({ subject: Subject.space(SPACE_ID), command: '/email' })],
        }),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox: Subject.object(OTHER_SPACE_ID, MAILBOX_ID) },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'no-grant' } });
    });
  });

  describe('the requirement policy', () => {
    test('is a floor the grant cannot lift', async ({ expect }) => {
      const grant = await run(
        Grant.make({
          issuer: alice,
          audience: agent,
          permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
        }),
      );
      const requirement = Requirement.make(SendEmail, {
        subject: Requirement.arg('mailbox'),
        policy: [Policy.lte('.args.attachments.length', 3)],
      });
      const source = sourceWith({ grants: [grant] });
      const few = await check({ principal: agent, requirement, args: { mailbox, attachments: [1, 2] }, source });
      const many = await check({ principal: agent, requirement, args: { mailbox, attachments: [1, 2, 3, 4] }, source });
      expect(Check.isAllowed(few)).toBe(true);
      expect(many).toMatchObject({ _tag: 'Denied', reason: { kind: 'policy', failed: { actual: 4 } } });
    });
  });

  describe('a grant to a space', () => {
    const editorsWrite = () =>
      Grant.make({
        issuer: space,
        audience: space,
        permissions: [
          Permission.make({
            subject: Subject.space(SPACE_ID),
            command: '/space/write',
            policy: [Policy.within('.caller.role', ['editor', 'admin', 'owner'])],
          }),
        ],
      });

    test('passes for a member whose role satisfies the policy', async ({ expect }) => {
      const grant = await run(editorsWrite());
      const result = await check({
        principal: bob,
        requirement: writeSpace,
        args: { space: Subject.space(SPACE_ID) },
        caller: { did: 'did:halo:BOB', role: 'editor' },
        source: Check.fromGrants({ grants: [grant], members: [{ spaceId: SPACE_ID, principal: bob, role: 'editor' }] }),
      });
      expect(Check.isAllowed(result)).toBe(true);
    });

    test('fails for a member whose role does not', async ({ expect }) => {
      const grant = await run(editorsWrite());
      const result = await check({
        principal: bob,
        requirement: writeSpace,
        args: { space: Subject.space(SPACE_ID) },
        caller: { did: 'did:halo:BOB', role: 'reader' },
        source: Check.fromGrants({ grants: [grant], members: [{ spaceId: SPACE_ID, principal: bob, role: 'reader' }] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'policy', failed: { path: '.caller.role' } } });
    });

    test('fails for a non-member even with the right role claimed', async ({ expect }) => {
      const grant = await run(editorsWrite());
      const result = await check({
        principal: bob,
        requirement: writeSpace,
        args: { space: Subject.space(SPACE_ID) },
        caller: { did: 'did:halo:BOB', role: 'editor' },
        source: Check.fromGrants({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'no-grant' } });
    });
  });

  describe('a delegation chain', () => {
    const aliceToBob = () =>
      Grant.make({
        issuer: alice,
        audience: bob,
        permissions: [
          Permission.make({
            subject: Subject.space(SPACE_ID),
            command: '/email',
            policy: [Policy.like('.args.to', '*@dxos.org')],
          }),
        ],
        delegable: true,
        expiresAt: Grant.inDays(7, NOW),
      });

    test('passes when each hop narrows the previous', async ({ expect }) => {
      const parent = await run(aliceToBob());
      const child = await run(
        Grant.attenuate(
          [parent],
          {
            audience: agent,
            permissions: [
              Permission.make({
                subject: mailbox,
                command: '/email/send',
                policy: [Policy.neq('.args.to', 'ceo@dxos.org')],
              }),
            ],
            expiresAt: Grant.inDays(30, NOW),
          },
          { now: NOW },
        ),
      );
      expect(child.issuer).toBe(bob);
      expect(child.proofs).toEqual([parent.id]);
      expect(child.expiresAt).toBe(parent.expiresAt);
      expect(child.permissions[0].policy).toEqual([
        Policy.like('.args.to', '*@dxos.org'),
        Policy.neq('.args.to', 'ceo@dxos.org'),
      ]);

      const source = sourceWith({ grants: [parent, child] });
      const ok = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source,
      });
      expect(Check.isAllowed(ok)).toBe(true);
      if (Check.isAllowed(ok)) {
        expect(ok.chain.map((link) => link.id)).toEqual([child.id, parent.id]);
      }
      const parentCaveat = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'x@example.com' },
        source,
      });
      expect(parentCaveat).toMatchObject({ _tag: 'Denied', reason: { kind: 'policy', failed: { path: '.args.to' } } });
      const childCaveat = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'ceo@dxos.org' },
        source,
      });
      expect(childCaveat).toMatchObject({ _tag: 'Denied', reason: { kind: 'policy' } });
    });

    test('attenuate refuses a permission the parent does not cover', async ({ expect }) => {
      const parent = await run(aliceToBob());
      const error = await run(
        Grant.attenuate(
          [parent],
          { audience: agent, permissions: [Permission.make({ subject: mailbox, command: '/sandbox/exec' })] },
          { now: NOW },
        ).pipe(Effect.flip),
      );
      expect(AttenuationError.is(error)).toBe(true);
    });

    test('attenuate refuses when the parent is not delegable', async ({ expect }) => {
      const parent = await run(
        Grant.make({
          issuer: alice,
          audience: bob,
          permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
        }),
      );
      const error = await run(
        Grant.attenuate(
          [parent],
          { audience: agent, permissions: [Permission.make({ subject: mailbox, command: '/email/send' })] },
          { now: NOW },
        ).pipe(Effect.flip),
      );
      expect(AttenuationError.is(error)).toBe(true);
    });

    test('fails when a hop was not delegable', async ({ expect }) => {
      const parent = await run(
        Grant.make({
          issuer: alice,
          audience: bob,
          permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
        }),
      );
      const child = await run(
        Grant.make({
          issuer: bob,
          audience: agent,
          permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
          proofs: [parent.id],
        }),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox },
        source: sourceWith({ grants: [parent, child] }),
      });
      expect(result).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'chain', grantId: child.id, detail: expect.stringContaining('not delegable') },
      });
    });

    test('fails when the child issuer is not the parent audience', async ({ expect }) => {
      const parent = await run(aliceToBob());
      const forged = await run(
        Grant.make({
          issuer: agent,
          audience: agent,
          permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
          proofs: [parent.id],
        }),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [parent, forged] }),
      });
      expect(result).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'chain', grantId: forged.id, detail: expect.stringContaining('audience') },
      });
    });

    test('fails when the root was revoked, even though the leaf was not', async ({ expect }) => {
      const parent = await run(aliceToBob());
      const child = await run(
        Grant.attenuate(
          [parent],
          { audience: agent, permissions: [Permission.make({ subject: mailbox, command: '/email/send' })] },
          { now: NOW },
        ),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [parent, child], revoked: [parent.id] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'revoked', grantId: parent.id } });
    });

    test('fails when the proof is missing from the source', async ({ expect }) => {
      const parent = await run(aliceToBob());
      const child = await run(
        Grant.attenuate(
          [parent],
          { audience: agent, permissions: [Permission.make({ subject: mailbox, command: '/email/send' })] },
          { now: NOW },
        ),
      );
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: sourceWith({ grants: [child] }),
      });
      expect(result).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'chain', detail: expect.stringContaining('not found') },
      });
    });
  });

  describe('signing on behalf of a space', () => {
    const adminsDelegate = () =>
      Grant.make({
        issuer: space,
        audience: space,
        permissions: [
          Permission.make({
            subject: Subject.space(SPACE_ID),
            command: '/space',
            policy: [Policy.within('.caller.role', ['admin', 'owner'])],
          }),
        ],
        delegable: true,
      });
    const request = {
      audience: agent,
      permissions: [Permission.make({ subject: Subject.space(SPACE_ID), command: '/space/read' })],
    };

    test('an admin can re-grant and the chain passes', async ({ expect }) => {
      const parent = await run(adminsDelegate());
      const child = await run(
        Grant.attenuate([parent], request, { now: NOW, signer: { did: 'did:halo:ALICE', role: 'admin' } }),
      );
      expect(child.issuer).toBe(space);
      expect(child.signer).toEqual({ did: 'did:halo:ALICE', role: 'admin' });
      const result = await check({
        principal: agent,
        requirement: Requirement.make('/space/read', { subject: Subject.space(SPACE_ID) }),
        caller: { did: 'did:halo:AGENT' },
        source: Check.fromGrants({
          grants: [parent, child],
          members: [{ spaceId: SPACE_ID, principal: alice, role: 'admin' }],
        }),
      });
      expect(Check.isAllowed(result)).toBe(true);
    });

    test('a signer whose claimed role the source does not confirm fails at check', async ({ expect }) => {
      const parent = await run(adminsDelegate());
      const child = await run(
        Grant.attenuate([parent], request, { now: NOW, signer: { did: 'did:halo:BOB', role: 'admin' } }),
      );
      const requirement = Requirement.make('/space/read', { subject: Subject.space(SPACE_ID) });
      const demoted = await check({
        principal: agent,
        requirement,
        source: Check.fromGrants({
          grants: [parent, child],
          members: [{ spaceId: SPACE_ID, principal: bob, role: 'editor' }],
        }),
      });
      expect(demoted).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'chain', detail: expect.stringContaining('(editor)') },
      });
      const stranger = await check({
        principal: agent,
        requirement,
        source: Check.fromGrants({ grants: [parent, child] }),
      });
      expect(stranger).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'chain', detail: expect.stringContaining('not a member') },
      });
    });

    test('the signer is in the signed payload, so swapping it changes the id', async ({ expect }) => {
      const parent = await run(adminsDelegate());
      const signed = await run(
        Grant.attenuate([parent], request, { now: NOW, signer: { did: 'did:halo:ALICE', role: 'admin' } }),
      );
      expect(await run(Grant.verifyId({ ...signed, signer: { did: 'did:halo:BOB', role: 'admin' } }))).toBe(false);
    });

    test('an editor cannot re-grant', async ({ expect }) => {
      const parent = await run(adminsDelegate());
      const error = await run(
        Grant.attenuate([parent], request, { now: NOW, signer: { did: 'did:halo:BOB', role: 'editor' } }).pipe(
          Effect.flip,
        ),
      );
      expect(AttenuationError.is(error)).toBe(true);
      expect(error.message).toContain('role');
    });

    test('a child forged without a signer fails at check', async ({ expect }) => {
      const parent = await run(adminsDelegate());
      const forged = await run(
        Grant.make({ issuer: space, audience: agent, permissions: request.permissions, proofs: [parent.id] }),
      );
      const result = await check({
        principal: agent,
        requirement: Requirement.make('/space/read', { subject: Subject.space(SPACE_ID) }),
        source: Check.fromGrants({ grants: [parent, forged] }),
      });
      expect(result).toMatchObject({
        _tag: 'Denied',
        reason: { kind: 'chain', detail: expect.stringContaining('signer') },
      });
    });
  });

  describe('consent', () => {
    const needsAlice = () =>
      Grant.make({
        issuer: alice,
        audience: agent,
        permissions: [Permission.make({ subject: mailbox, command: '/email/send' })],
        consent: { by: alice, scope: 'session' },
      });

    test('fails until the named principal consents', async ({ expect }) => {
      const grant = await run(needsAlice());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'consent', by: alice, consentable: true } });
    });

    test('passes with a matching consent and fails once it expires', async ({ expect }) => {
      const grant = await run(needsAlice());
      const consent = Consent.make({
        grantId: grant.id,
        by: alice,
        scope: 'session',
        grantedAt: NOW,
        expiresAt: Grant.inHours(1, NOW),
      });
      const source = sourceWith({ grants: [grant], consents: [consent] });
      expect(
        Check.isAllowed(await check({ principal: agent, requirement: sendEmail, args: { mailbox }, source })),
      ).toBe(true);
      const later = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox },
        source,
        now: Grant.inHours(2, NOW),
      });
      expect(later).toMatchObject({ _tag: 'Denied', reason: { kind: 'consent' } });
    });

    test("someone else's consent does not count", async ({ expect }) => {
      const grant = await run(needsAlice());
      const consent = Consent.make({ grantId: grant.id, by: bob, grantedAt: NOW });
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox },
        source: sourceWith({ grants: [grant], consents: [consent] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'consent' } });
    });
  });

  describe('a process environment', () => {
    test('the runtime roots a grant to a process and the process can attenuate for a child', async ({ expect }) => {
      const toProcess = await run(
        Grant.make({
          issuer: runtime,
          audience: childProcess,
          permissions: [Permission.make({ subject: Subject.space(SPACE_ID), command: '/space' })],
          delegable: true,
          expiresAt: Grant.inHours(1, NOW),
        }),
      );
      const grandchild = Principal.process(`echo://${SPACE_ID}/01GRANDCHILD`);
      const toGrandchild = await run(
        Grant.attenuate(
          [toProcess],
          {
            audience: grandchild,
            permissions: [Permission.make({ subject: Subject.space(SPACE_ID), command: '/space/read' })],
            expiresAt: Grant.inMinutes(30, NOW),
          },
          { now: NOW },
        ),
      );
      expect(toGrandchild.expiresAt).toBe(Grant.inMinutes(30, NOW));
      const source = Check.fromGrants({ grants: [toProcess, toGrandchild], trusted: [runtime] });
      const read = await check({
        principal: grandchild,
        requirement: Requirement.make('/space/read', { subject: Subject.space(SPACE_ID) }),
        source,
      });
      const write = await check({
        principal: grandchild,
        requirement: Requirement.make('/space/write', { subject: Subject.space(SPACE_ID) }),
        source,
      });
      expect(Check.isAllowed(read)).toBe(true);
      expect(write).toMatchObject({ _tag: 'Denied', reason: { kind: 'no-grant' } });
    });
  });

  describe('merged sources', () => {
    test('a grant held by any source counts and a revocation in any source applies', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const merged = Check.merge(sourceWith({ grants: [grant] }), Check.fromGrants({ revoked: [grant.id] }));
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { mailbox, to: 'rich@dxos.org' },
        source: merged,
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'revoked' } });
    });
  });

  describe('subject resolution', () => {
    test('fails when the selector points at nothing', async ({ expect }) => {
      const grant = await run(agentMayEmailDxos());
      const result = await check({
        principal: agent,
        requirement: sendEmail,
        args: { to: 'rich@dxos.org' },
        source: sourceWith({ grants: [grant] }),
      });
      expect(result).toMatchObject({ _tag: 'Denied', reason: { kind: 'subject' } });
    });
  });
});
