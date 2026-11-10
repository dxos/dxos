//
// Copyright 2025 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey } from '@dxos/keys';
import { createBuf, fromPublicKey } from '@dxos/protocols/buf';
import { SpaceMemberSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Expando } from '@dxos/schema';

import * as AppSettings from '../types/AppSettings.ts';
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

/**
 * The decisions live in the space's own settings object, so these need a real database: naming the
 * object writes an annotation and adds to `db`, and reading it back loads a ref.
 */
describe('space plugins', () => {
  const THREAD = 'org.dxos.plugin.thread';
  const TABLE = 'org.dxos.plugin.table';

  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** A space as the plugin helpers use it: a database to name the settings object in, and properties to name it on. */
  const makeSpaceWithDb = async (): Promise<Space> => {
    const { db } = await builder.createDatabase({ types: [AppSettings.AppSettings, Expando.Expando] });
    const properties = db.add(Obj.make(Expando.Expando, {}));
    await db.flush();
    return { db, properties } as unknown as Space;
  };

  const setEnabled = (space: Space, id: string, enabled: boolean) =>
    EffectEx.runPromise(AppSpace.setSpacePluginEnabled(space, id, enabled));

  test('an untouched space has made no choice, so its members run their own sets', async ({ expect }) => {
    const space = await makeSpaceWithDb();
    expect(AppSpace.getSpacePlugins(space)).toEqual({});
    expect(AppSpace.getEnabledSpacePlugins(space)).toBeUndefined();
  });

  test('the first decision names the space a settings object', async ({ expect }) => {
    const space = await makeSpaceWithDb();
    expect(AppSpace.getAppSettings(space)).toBeUndefined();

    await setEnabled(space, THREAD, true);

    // The same object and annotation the settings space holds the identity's set in.
    const settings = AppSpace.getAppSettings(space);
    expect(settings && Obj.instanceOf(AppSettings.AppSettings, settings)).toBe(true);
  });

  test('decisions are recorded under the shared plugins namespace', async ({ expect }) => {
    const space = await makeSpaceWithDb();
    await setEnabled(space, THREAD, true);
    await setEnabled(space, TABLE, false);

    const settings = AppSpace.getAppSettings(space)!;
    expect(Obj.getSnapshot(settings).shared[AppSettings.PLUGINS_NAMESPACE]).toEqual({
      [THREAD]: true,
      [TABLE]: false,
    });
    expect(AppSpace.getSpacePlugins(space)).toEqual({ [THREAD]: true, [TABLE]: false });
    expect(AppSpace.getEnabledSpacePlugins(space)).toEqual([THREAD]);
  });

  test('a record naming nothing enabled is the space having made no choice', async ({ expect }) => {
    // Not "the space runs nothing": a space with every plugin off can do nothing, so the two collapse
    // and the fallback to each member's own set survives (spec D-81).
    const space = await makeSpaceWithDb();
    await setEnabled(space, THREAD, false);
    expect(AppSpace.getEnabledSpacePlugins(space)).toBeUndefined();
  });

  test('disabling the last plugin returns the space to deferring to its members', async ({ expect }) => {
    const space = await makeSpaceWithDb();
    await setEnabled(space, THREAD, true);
    await setEnabled(space, THREAD, false);
    expect(AppSpace.getEnabledSpacePlugins(space)).toBeUndefined();
  });

  test('a reset drops the namespace, leaving the settings object for anything else it holds', async ({ expect }) => {
    const space = await makeSpaceWithDb();
    await setEnabled(space, THREAD, true);
    const settings = AppSpace.getAppSettings(space)!;
    Obj.update(settings, (settings) => {
      AppSettings.setValue({ shared: settings.shared, local: {} }, 'com.example.other', 'keep', true);
    });

    await EffectEx.runPromise(AppSpace.clearSpacePlugins(space));

    expect(AppSpace.getSpacePlugins(space)).toEqual({});
    expect(AppSpace.getEnabledSpacePlugins(space)).toBeUndefined();
    expect(Obj.getSnapshot(settings).shared['com.example.other']).toEqual({ keep: true });
  });
});
