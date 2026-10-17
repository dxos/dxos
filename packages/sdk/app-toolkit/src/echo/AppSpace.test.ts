//
// Copyright 2025 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { anyIs } from '@bufbuild/protobuf/wkt';
import { describe, test } from 'vitest';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { anyPackBare, createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import {
  type Credential,
  CredentialSchema,
  SettingsSpaceSchema,
  SpaceDeletedSchema,
  SpaceMember_Role,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Expando } from '@dxos/schema';

import * as AppSpace from './AppSpace.ts';

describe('space tags', () => {
  test('hasTag returns true when tag is present', ({ expect }) => {
    const space = makeSpace(['personal', 'pinned']);
    expect(AppSpace.hasTag(space, 'personal')).toBe(true);
    expect(AppSpace.hasTag(space, 'pinned')).toBe(true);
  });

  test('hasTag returns false when tag is absent', ({ expect }) => {
    expect(AppSpace.hasTag(makeSpace(['personal']), 'archived')).toBe(false);
  });

  test('hasTag handles empty tags', ({ expect }) => {
    expect(AppSpace.hasTag(makeSpace([]), 'personal')).toBe(false);
  });

  test('isSettingsSpace matches the settings tag only', ({ expect }) => {
    expect(AppSpace.isSettingsSpace(makeSpace([AppSpace.SETTINGS_SPACE_TAG]))).toBe(true);
    expect(AppSpace.isSettingsSpace(makeSpace([AppSpace.PERSONAL_SPACE_TAG]))).toBe(false);
  });

  test('isLegacyDefaultSpace matches the deprecated personal tag', ({ expect }) => {
    expect(AppSpace.isLegacyDefaultSpace(makeSpace([AppSpace.PERSONAL_SPACE_TAG]))).toBe(true);
    expect(AppSpace.isLegacyDefaultSpace(makeSpace([]))).toBe(false);
  });
});

describe('agent identities', () => {
  test("only an agent's admins may add it elsewhere", ({ expect }) => {
    const [kai, ada, admin, editor, reader] = [...Array(5)].map(() => PublicKey.random());
    const member = (key: PublicKey, role: SpaceMember_Role) =>
      createBuf(SpaceMemberSchema, { identity: { identityKey: fromPublicKey(key) }, role });
    const agentSpace = (agent: PublicKey, ...members: ReturnType<typeof member>[]) => ({
      tags: [AppSpace.AGENT_SPACE_TAG],
      members: { get: () => [member(agent, SpaceMember_Role.OWNER), ...members] },
    });
    const spaces = [
      agentSpace(kai, member(admin, SpaceMember_Role.ADMIN), member(reader, SpaceMember_Role.READER)),
      agentSpace(ada, member(editor, SpaceMember_Role.EDITOR)),
      { tags: [], members: { get: () => [member(reader, SpaceMember_Role.OWNER)] } },
    ];
    const hexes = (self: PublicKey) => AppSpace.agentsNotAdministeredBy(spaces, self).map((key) => key.toHex());
    expect(hexes(admin)).toEqual([ada.toHex()]);
    expect(hexes(editor)).toEqual([kai.toHex()]);
    expect(hexes(reader)).toEqual([kai.toHex(), ada.toHex()]);
  });
});

describe('space visibility', () => {
  test('an untagged space is visible', ({ expect }) => {
    expect(AppSpace.isVisibleSpace(makeSpace([]))).toBe(true);
  });

  test("the settings space is hidden, tagged alone or alongside the user's own tags", ({ expect }) => {
    expect(AppSpace.isVisibleSpace(makeSpace([AppSpace.SETTINGS_SPACE_TAG]))).toBe(false);
    expect(AppSpace.isVisibleSpace(makeSpace(['com.example.pinned', AppSpace.SETTINGS_SPACE_TAG]))).toBe(false);
  });

  test('every other tagged space belongs to the user, including tags this one has not heard of', ({ expect }) => {
    expect(AppSpace.isVisibleSpace(makeSpace(['org.dxos.space.exemplar']))).toBe(true);
    expect(AppSpace.isVisibleSpace(makeSpace([AppSpace.PERSONAL_SPACE_TAG]))).toBe(true);
    expect(AppSpace.isVisibleSpace(makeSpace(['com.example.pinned']))).toBe(true);
  });
});

describe('settings space resolution', () => {
  test('tagged spaces order by id, not list order', ({ expect }) => {
    // Healing deletes everything but the first entry, so the order must be identical on every
    // device regardless of how the local list happens to be arranged.
    const second = makeClosedSpace('B00000000000000000000000000000002', [AppSpace.SETTINGS_SPACE_TAG]);
    const first = makeClosedSpace('B00000000000000000000000000000001', [AppSpace.SETTINGS_SPACE_TAG]);
    expect(AppSpace.getSettingsSpaces({ spaces: { get: () => [second, first] } }).map((space) => space.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(AppSpace.getSettingsSpaces({ spaces: { get: () => [first, second] } }).map((space) => space.id)).toEqual([
      first.id,
      second.id,
    ]);
    // With no readable designation the read-side resolution falls back to the same order.
    expect(AppSpace.getSettingsSpace({ spaces: { get: () => [second, first] } })?.id).toBe(first.id);
  });

  test('a readable duplicate beats an unopened lower-id one for reading', ({ expect }) => {
    // Waiting on an unopened space would stall the bootstrap while a readable copy already exists.
    const closed = makeClosedSpace('B00000000000000000000000000000001', [AppSpace.SETTINGS_SPACE_TAG]);
    const ready = makeReadySpace('B00000000000000000000000000000002', [AppSpace.SETTINGS_SPACE_TAG]);
    expect(AppSpace.getSettingsSpace({ spaces: { get: () => [closed, ready] } })?.id).toBe(ready.id);
  });

  test('the space a credential names wins over the readable heuristic', ({ expect }) => {
    const closed = makeClosedSpace('B00000000000000000000000000000002', [AppSpace.SETTINGS_SPACE_TAG]);
    const ready = makeReadySpace('B00000000000000000000000000000001', [AppSpace.SETTINGS_SPACE_TAG]);
    const halo = makeHalo([settingsSpaceCredential(closed.id, PublicKey.random())]);
    expect(AppSpace.getSettingsSpace({ spaces: { get: () => [closed, ready] }, halo })?.id).toBe(closed.id);
  });

  test('the lowest live credentialed id is canonical; a deleted one is ignored', ({ expect }) => {
    const [lowKey, highKey] = [PublicKey.random(), PublicKey.random()];
    const low = 'B00000000000000000000000000000001';
    const high = 'B00000000000000000000000000000002';
    const both = [settingsSpaceCredential(high, highKey), settingsSpaceCredential(low, lowKey)];
    expect(AppSpace.getCredentialedSettingsSpaceIds({ halo: makeHalo(both) })).toEqual([low, high]);
    expect(AppSpace.getCanonicalSettingsSpaceId({ halo: makeHalo([...both, spaceDeletedCredential(lowKey)]) })).toBe(
      high,
    );
  });
});

const settingsSpaceCredential = (spaceId: string, spaceKey: PublicKey): Credential =>
  create(CredentialSchema, {
    subject: {
      assertion: anyPackBare(
        SettingsSpaceSchema,
        create(SettingsSpaceSchema, { spaceId, spaceKey: fromPublicKey(spaceKey) }),
      ),
    },
  });

const spaceDeletedCredential = (spaceKey: PublicKey): Credential =>
  create(CredentialSchema, {
    subject: {
      assertion: anyPackBare(SpaceDeletedSchema, create(SpaceDeletedSchema, { spaceKey: fromPublicKey(spaceKey) })),
    },
  });

/** A HALO holding `credentials`, filtered by type as the client filters them. */
const makeHalo = (credentials: Credential[]) => ({
  queryCredentials: ({ type }: { type: string }) =>
    credentials.filter((credential) => credential.subject?.assertion && anyIs(credential.subject.assertion, type)),
});

/**
 * A stand-in carrying only the fields the tag predicates read. Cast here rather than widening the
 * predicates, so production code sees a real `Space` and the fake stays contained to the test.
 */
const makeSpace = (tags: string[]): Space => ({ tags, properties: {} }) as unknown as Space;

/** As {@link makeSpace}, adding the id and closed state the settings-space resolution reads. */
const makeClosedSpace = (id: string, tags: string[]): Space =>
  ({ id, tags, properties: {}, state: { get: () => SpaceState.SPACE_CLOSED } }) as unknown as Space;

/** As {@link makeClosedSpace}, ready and with real (annotation-readable) properties. */
const makeReadySpace = (id: string, tags: string[]): Space =>
  ({
    id,
    tags,
    properties: Obj.make(Expando.Expando, {}),
    state: { get: () => SpaceState.SPACE_READY },
  }) as unknown as Space;

describe('space templates', () => {
  const LEGACY_TAG = 'org.dxos.space.exemplar';
  const TEMPLATE_ID = 'org.dxos.plugin.onboarding.template.bramble';
  const client = (spaces: Space[]) => ({ spaces: { get: () => spaces } });

  test('stamps the template a legacy onboarding space came from', ({ expect }) => {
    const space = makeReadySpace('a', [LEGACY_TAG]);
    expect(AppSpace.migrateLegacyOnboardingSpaces(client([space]), TEMPLATE_ID)).toEqual(['a']);
    expect(AppSpace.getSpaceTemplateId(space)).toBe(TEMPLATE_ID);
    expect(AppSpace.findSpaceFromTemplate(client([space]), TEMPLATE_ID)).toBe(space);
  });

  test('re-running stamps nothing, so a later template wins over the tag', ({ expect }) => {
    const space = makeReadySpace('a', [LEGACY_TAG]);
    AppSpace.setSpaceTemplateId(space, 'com.example.template.other');
    expect(AppSpace.migrateLegacyOnboardingSpaces(client([space]), TEMPLATE_ID)).toEqual([]);
    expect(AppSpace.getSpaceTemplateId(space)).toBe('com.example.template.other');
  });

  test('skips spaces that are untagged or not yet readable', ({ expect }) => {
    const untagged = makeReadySpace('a', []);
    const closed = makeClosedSpace('b', [LEGACY_TAG]);
    expect(AppSpace.migrateLegacyOnboardingSpaces(client([untagged, closed]), TEMPLATE_ID)).toEqual([]);
    expect(AppSpace.getSpaceTemplateId(untagged)).toBeUndefined();
  });
});
