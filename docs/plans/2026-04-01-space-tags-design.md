# Space Tags Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add immutable string tags to spaces, written at creation time, propagated through credentials and metadata, and use them to identify the personal space.

**Architecture:** Tags are added to `SpaceGenesis` and `SpaceMember` proto messages, stored in `SpaceMetadata` for local persistence, and exposed on the `Space` interface/proxy. On creation, tags flow through the RPC layer into genesis credentials. On invitation, tags are copied into the `SpaceMember` credential so joining peers receive them. The personal space is then identified via a `'personal'` tag with fallback to the legacy `__DEFAULT__` property.

**Tech Stack:** Protocol Buffers, TypeScript, vitest

**Tracks:** [DX-891](https://linear.app/dxos/issue/DX-891/space-tags)

---

### Task 1: Proto changes — Add tags fields

**Files:**

- Modify: `packages/core/protocols/src/proto/dxos/halo/credentials.proto:32-34` (SpaceGenesis)
- Modify: `packages/core/protocols/src/proto/dxos/halo/credentials.proto:60-72` (SpaceMember)
- Modify: `packages/core/protocols/src/proto/dxos/echo/metadata.proto:53-80` (SpaceMetadata)
- Modify: `packages/core/protocols/src/proto/dxos/client/services.proto:271-341` (Space message)
- Modify: `packages/core/protocols/src/proto/dxos/client/services.proto:460-461` (CreateSpace RPC)

**Step 1: Add tags to SpaceGenesis**

In `credentials.proto`, add field 2 to `SpaceGenesis`:

```protobuf
message SpaceGenesis {
  dxos.keys.PublicKey space_key = 1;
  repeated string tags = 2;
}
```

**Step 2: Add tags to SpaceMember**

In `credentials.proto`, add field 6 to `SpaceMember`:

```protobuf
message SpaceMember {
  // ... existing fields ...
  optional dxos.keys.PublicKey invitation_credential_id = 5;
  repeated string tags = 6;
}
```

**Step 3: Add tags to SpaceMetadata**

In `metadata.proto`, add field 12 to `SpaceMetadata`:

```protobuf
message SpaceMetadata {
  // ... existing fields ...
  optional EdgeReplicationSetting edge_replication = 11;
  repeated string tags = 12;
}
```

**Step 4: Add tags to Space message and CreateSpaceRequest**

In `services.proto`, add field 7 to `Space` message:

```protobuf
message Space {
  // ... existing fields ...
  optional dxos.echo.metadata.EdgeReplicationSetting edge_replication = 6;
  repeated string tags = 7;
  // ... rest ...
}
```

Add a `CreateSpaceRequest` message and update the RPC:

```protobuf
message CreateSpaceRequest {
  repeated string tags = 1;
}

service SpacesService {
  rpc CreateSpace(CreateSpaceRequest) returns (Space);
  // ... rest unchanged ...
}
```

**Step 5: Build protos**

Run: `moon run protocols:build`
Expected: Build succeeds, generated TypeScript types include `tags` fields.

**Step 6: Commit**

```
feat(protocols): add tags fields to space proto messages
```

---

### Task 2: Space state machine — expose tags from genesis credential

**Files:**

- Modify: `packages/core/halo/credentials/src/state-machine/space-state-machine.ts:21-37` (SpaceState interface)
- Modify: `packages/core/halo/credentials/src/state-machine/space-state-machine.ts:55-105` (SpaceStateMachine class)
- Test: `packages/core/halo/credentials/src/state-machine/space-state-machine.test.ts`

**Step 1: Write the failing test**

Add a test to `space-state-machine.test.ts`:

```typescript
test('space genesis with tags', async () => {
  const keyring = new Keyring();
  const space = await keyring.createKey();
  const identity = await keyring.createKey();
  const feed = await keyring.createKey();

  const spaceState = new SpaceStateMachine(space);

  expect(spaceState.tags).toEqual([]);

  await spaceState.process(
    await createCredential({
      issuer: space,
      subject: space,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceGenesis',
        spaceKey: space,
        tags: ['personal', 'test'],
      },
      signer: keyring,
    }),
    { sourceFeed: feed },
  );

  expect(spaceState.tags).toEqual(['personal', 'test']);

  await spaceState.process(
    await createCredential({
      issuer: space,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey: space,
        role: SpaceMember.Role.ADMIN,
        genesisFeedKey: feed,
      },
      signer: keyring,
    }),
    { sourceFeed: feed },
  );

  // Tags still come from genesis, not member.
  expect(spaceState.tags).toEqual(['personal', 'test']);
});

test('space genesis without tags returns empty array', async () => {
  const keyring = new Keyring();
  const space = await keyring.createKey();
  const feed = await keyring.createKey();

  const spaceState = new SpaceStateMachine(space);

  await spaceState.process(
    await createCredential({
      issuer: space,
      subject: space,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceGenesis',
        spaceKey: space,
      },
      signer: keyring,
    }),
    { sourceFeed: feed },
  );

  expect(spaceState.tags).toEqual([]);
});
```

**Step 2: Run test to verify it fails**

Run: `moon run credentials:test -- packages/core/halo/credentials/src/state-machine/space-state-machine.test.ts`
Expected: FAIL — `spaceState.tags` does not exist.

**Step 3: Add tags to SpaceState interface and SpaceStateMachine**

In `space-state-machine.ts`, add to `SpaceState` interface (after line 26):

```typescript
readonly tags: string[];
```

In `SpaceStateMachine` class, add a `_tags` field and a getter:

```typescript
private _tags: string[] = [];

get tags(): string[] {
  return this._tags;
}
```

In the `SpaceGenesis` case of the `process` method (after `this._genesisCredential = credential;` at line 182), extract tags:

```typescript
this._tags = assertion.tags ?? [];
```

**Step 4: Run test to verify it passes**

Run: `moon run credentials:test -- packages/core/halo/credentials/src/state-machine/space-state-machine.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat(credentials): expose tags from space genesis on SpaceStateMachine
```

---

### Task 3: Genesis credential creation — include tags

**Files:**

- Modify: `packages/sdk/client-services/src/packlets/spaces/genesis.ts:14-87`
- Test: Add test in `packages/sdk/client-services/src/packlets/spaces/genesis.test.ts` (new file)

**Step 1: Write the failing test**

Create `genesis.test.ts`:

```typescript
import { describe, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

import { type SigningContext } from './data-space-manager';
import { spaceGenesis } from './genesis';
import { createSigningContext } from './testing'; // check if this exists, otherwise inline

describe('spaceGenesis', () => {
  test('includes tags in SpaceGenesis and SpaceMember credentials', async ({ expect }) => {
    // This test will need the Space mock from echo-pipeline.
    // We'll verify the credential assertions contain tags.
    // Exact setup depends on available test utilities — may need adjustment.
  });
});
```

> **Note to implementer:** The `spaceGenesis` function requires a `Space` object from echo-pipeline and a `Keyring`. Check existing tests in `data-space-manager.test.ts` for setup patterns. If mocking is too complex, test tags at the integration level in Task 6 instead and skip the unit test here. The critical thing is that `spaceGenesis()` passes tags through.

**Step 2: Modify spaceGenesis to accept and include tags**

In `genesis.ts`, add `tags` parameter and include in assertions:

```typescript
export const spaceGenesis = async (
  keyring: Keyring,
  signingContext: SigningContext,
  space: Space,
  automergeRoot?: string,
  tags?: string[],
) => {
  const credentials = [
    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: space.key,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceGenesis',
        spaceKey: space.key,
        tags: tags ?? [],
      },
    }),

    await createCredential({
      signer: keyring,
      issuer: space.key,
      subject: signingContext.identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey: space.key,
        role: SpaceMember.Role.OWNER,
        profile: signingContext.getProfile(),
        genesisFeedKey: space.controlFeedKey ?? failUndefined(),
        tags: tags ?? [],
      },
    }),
    // ... rest unchanged (AdmittedFeed and Epoch credentials) ...
  ];
  // ... rest unchanged ...
};
```

**Step 3: Build**

Run: `moon run client-services:build`
Expected: Build succeeds.

**Step 4: Commit**

```
feat(client-services): pass tags through spaceGenesis credential creation
```

---

### Task 4: Admission credentials — include tags

**Files:**

- Modify: `packages/core/halo/credentials/src/credentials/credential-generator.ts:215-243`
- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:89-95` (AdmitMemberOptions)
- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:366-393` (admitMember)

**Step 1: Add tags parameter to createAdmissionCredentials**

In `credential-generator.ts`, add `tags` to parameters and the assertion:

```typescript
export const createAdmissionCredentials = async (
  signer: CredentialSigner,
  identityKey: PublicKey,
  spaceKey: PublicKey,
  genesisFeedKey: PublicKey,
  role: SpaceMember.Role = SpaceMember.Role.ADMIN,
  membershipChainHeads: PublicKey[] = [],
  profile?: ProfileDocument,
  invitationCredentialId?: PublicKey,
  tags?: string[],
): Promise<FeedMessage.Payload[]> => {
  const credentials = await Promise.all([
    await signer.createCredential({
      subject: identityKey,
      parentCredentialIds: membershipChainHeads,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey,
        role,
        profile,
        genesisFeedKey,
        invitationCredentialId,
        tags: tags ?? [],
      },
    }),
  ]);
  // ... rest unchanged ...
};
```

**Step 2: Add tags to AdmitMemberOptions and pass through admitMember**

In `data-space-manager.ts`, update `AdmitMemberOptions`:

```typescript
export type AdmitMemberOptions = {
  spaceKey: PublicKey;
  identityKey: PublicKey;
  role: SpaceMember.Role;
  profile?: ProfileDocument;
  delegationCredentialId?: PublicKey;
  tags?: string[];
};
```

In `admitMember()`, pass tags to `createAdmissionCredentials`:

```typescript
const credentials: FeedMessage.Payload[] = await createAdmissionCredentials(
  this._signingContext.credentialSigner,
  options.identityKey,
  space.key,
  space.genesisFeedKey,
  options.role,
  space.spaceState.membershipChainHeads,
  options.profile,
  options.delegationCredentialId,
  space.spaceState.tags, // Tags from the space's genesis credential
);
```

**Step 3: Build**

Run: `moon run credentials:build && moon run client-services:build`
Expected: Build succeeds.

**Step 4: Commit**

```
feat(credentials): include tags in admission credentials
```

---

### Task 5: Space creation flow — pass tags through RPC and DataSpaceManager

**Files:**

- Modify: `packages/sdk/client-services/src/packlets/spaces/spaces-service.ts:69-75` (createSpace)
- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:125-128` (CreateSpaceOptions)
- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:254-341` (createSpace)
- Modify: `packages/sdk/client-services/src/packlets/spaces/spaces-service.ts:321-370` (\_serializeSpace)
- Modify: `packages/sdk/client/src/echo/space-list.ts:248-266` (create)
- Modify: `packages/sdk/client-protocol/src/echo.ts:38` (Echo.create signature)
- Modify: `packages/sdk/client-protocol/src/space.ts:70-149` (Space interface)
- Modify: `packages/sdk/client/src/echo/space-proxy.ts:190-240` (SpaceProxy)

**Step 1: Update CreateSpaceOptions**

In `data-space-manager.ts`:

```typescript
export type CreateSpaceOptions = {
  rootUrl?: AutomergeUrl;
  documents?: Record<DocumentId, Uint8Array>;
  tags?: string[];
};
```

**Step 2: Pass tags through DataSpaceManager.createSpace**

In `createSpace()`, pass `options.tags` to `spaceGenesis()` and include in metadata:

```typescript
const metadata: SpaceMetadata = {
  key: spaceKey,
  genesisFeedKey: controlFeedKey,
  controlFeedKey,
  dataFeedKey,
  state: SpaceState.SPACE_ACTIVE,
  tags: options.tags ?? [],
};

// ... later ...
const credentials = await spaceGenesis(this._keyring, this._signingContext, space.inner, root.url, options.tags);
```

**Step 3: Update SpacesServiceImpl.createSpace to accept and forward tags**

In `spaces-service.ts`:

```typescript
async createSpace(request?: CreateSpaceRequest): Promise<Space> {
  this._requireIdentity();
  const dataSpaceManager = await this._getDataSpaceManager();
  const space = await dataSpaceManager.createSpace({ tags: request?.tags });
  await this._updateMetrics();
  return this._serializeSpace(space);
}
```

**Step 4: Add tags to \_serializeSpace**

In `_serializeSpace()`, add tags from the space state machine:

```typescript
private async _serializeSpace(space: DataSpace): Promise<Space> {
  return {
    // ... existing fields ...
    creator: space.inner.spaceState.creator?.key,
    tags: space.inner.spaceState.tags,
    cache: space.cache,
    // ... rest ...
  };
}
```

**Step 5: Add tags to Space interface**

In `packages/sdk/client-protocol/src/space.ts`, add to `Space` interface:

```typescript
/**
 * Immutable tags assigned at space creation time.
 * Available on closed spaces.
 */
get tags(): string[];
```

**Step 6: Add tags getter to SpaceProxy**

In `space-proxy.ts`, add getter:

```typescript
get tags(): string[] {
  return this._data.tags ?? [];
}
```

**Step 7: Update Echo.create signature**

In `packages/sdk/client-protocol/src/echo.ts`, change `create` to accept tags:

```typescript
create(props?: Pick<SpaceProperties, 'name' | 'hue' | 'icon' | 'invocationTraceQueue'>, options?: { tags?: string[] }): Promise<Space>;
```

**Step 8: Update SpaceList.create to pass tags through RPC**

In `space-list.ts`:

```typescript
async create(meta?: SpaceProperties, options?: { tags?: string[] }): Promise<Space> {
  invariant(this._serviceProvider.services.SpacesService, 'SpacesService is not available.');
  const traceId = PublicKey.random().toHex();
  log.trace('dxos.sdk.echo-proxy.create-space', Trace.begin({ id: traceId }));
  const space = await this._serviceProvider.services.SpacesService.createSpace(
    { tags: options?.tags ?? [] },
    { timeout: RPC_TIMEOUT },
  );
  // ... rest unchanged ...
}
```

**Step 9: Build**

Run: `moon run client-protocol:build && moon run client:build && moon run client-services:build`
Expected: Build succeeds.

**Step 10: Commit**

```
feat(client): pass space tags through creation flow from SDK to genesis
```

---

### Task 6: Accept space flow — extract and store tags from invitation

**Files:**

- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:72-87` (AcceptSpaceOptions)
- Modify: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.ts:344-364` (acceptSpace)
- Modify: `packages/sdk/client-services/src/packlets/invitations/space-invitation-protocol.ts:173-195` (accept)
- Modify: `packages/sdk/client-services/src/packlets/invitations/space-invitation-protocol.ts:70-93` (admit)

**Step 1: Add tags to AcceptSpaceOptions**

```typescript
export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;
  controlTimeframe?: Timeframe;
  dataTimeframe?: Timeframe;
  tags?: string[];
};
```

**Step 2: Store tags in metadata during acceptSpace**

```typescript
async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
  // ...
  const metadata: SpaceMetadata = {
    key: opts.spaceKey,
    genesisFeedKey: opts.genesisFeedKey,
    controlTimeframe: opts.controlTimeframe,
    dataTimeframe: opts.dataTimeframe,
    tags: opts.tags ?? [],
  };
  // ... rest unchanged ...
}
```

**Step 3: Extract tags in space-invitation-protocol accept()**

```typescript
async accept(response: AdmissionResponse): Promise<Partial<Invitation>> {
  invariant(response.space);
  const { credential, controlTimeframe, dataTimeframe } = response.space;
  const assertion = getCredentialAssertion(credential);
  invariant(assertion['@type'] === 'dxos.halo.credentials.SpaceMember', 'Invalid credential');
  invariant(credential.subject.id.equals(this._signingContext.identityKey));

  if (this._spaceManager.spaces.has(assertion.spaceKey)) {
    throw new AlreadyJoinedError({ message: 'Already joined space.' });
  }

  await this._spaceManager.acceptSpace({
    spaceKey: assertion.spaceKey,
    genesisFeedKey: assertion.genesisFeedKey,
    controlTimeframe,
    dataTimeframe,
    tags: assertion.tags,
  });

  await this._signingContext.recordCredential(credential);
  return { spaceKey: assertion.spaceKey };
}
```

**Step 4: Pass tags from host in admit()**

In `space-invitation-protocol.ts admit()`, pass tags to `admitMember`:

```typescript
async admit(
  invitation: Invitation,
  request: AdmissionRequest,
  guestProfile?: ProfileDocument | undefined,
): Promise<AdmissionResponse> {
  invariant(this._spaceKey && request.space);

  const spaceMemberCredential = await this._spaceManager.admitMember({
    spaceKey: this._spaceKey,
    identityKey: request.space.identityKey,
    role: invitation.role ?? SpaceMember.Role.ADMIN,
    profile: guestProfile,
    delegationCredentialId: invitation.delegationCredentialId,
    // tags are automatically picked up from space.spaceState.tags in admitMember
  });
  // ... rest unchanged ...
}
```

> **Note:** Tags are already sourced from `space.spaceState.tags` inside `admitMember()` (Task 4), so the `admit()` method doesn't need to pass them explicitly.

**Step 5: Also update joinBySpaceKey in spaces-service.ts**

Check `joinBySpaceKey` in `spaces-service.ts` — it calls `acceptSpace` with assertion data. Add tags there too:

```typescript
// In the joinBySpaceKey handler, where acceptSpace is called:
dataSpace = await dataSpaceManager.acceptSpace({
  spaceKey: assertion.spaceKey,
  genesisFeedKey: assertion.genesisFeedKey,
  tags: assertion.tags,
});
```

**Step 6: Build**

Run: `moon run client-services:build`
Expected: Build succeeds.

**Step 7: Commit**

```
feat(client-services): extract and store tags from invitation credentials
```

---

### Task 7: Integration tests — create and join space with tags

**Files:**

- Test: `packages/core/halo/credentials/src/state-machine/space-state-machine.test.ts` (already done in Task 2)
- Test: `packages/sdk/client-services/src/packlets/spaces/data-space-manager.test.ts` (add test)

**Step 1: Write integration test for DataSpaceManager**

Add test in `data-space-manager.test.ts` (following existing test patterns in that file):

```typescript
test('creates space with tags', async ({ expect }) => {
  // Use existing test setup pattern from the file.
  // Create space with tags, verify tags are in genesis credential and state machine.
  const space = await dataSpaceManager.createSpace({ tags: ['personal', 'test'] });
  expect(space.inner.spaceState.tags).toEqual(['personal', 'test']);
});

test('creates space without tags has empty tags', async ({ expect }) => {
  const space = await dataSpaceManager.createSpace();
  expect(space.inner.spaceState.tags).toEqual([]);
});
```

> **Note to implementer:** Match the existing test setup patterns in the file. The test setup may require creating a `DataSpaceManager` with its dependencies. Look at the existing `describe` blocks for the pattern.

**Step 2: Run tests**

Run: `moon run client-services:test -- packages/sdk/client-services/src/packlets/spaces/data-space-manager.test.ts`
Expected: PASS

**Step 3: Commit**

```
test(client-services): add integration tests for space tags
```

---

### Task 8: Personal space — use tags with fallback

**Files:**

- Modify: `packages/sdk/app-toolkit/src/personal-space.ts`
- Test: `packages/sdk/app-toolkit/src/personal-space.test.ts` (new file)

**Step 1: Write the failing tests**

Create `personal-space.test.ts`:

```typescript
import { describe, test, expect } from 'vitest';

import { hasTag, isPersonalSpace } from './personal-space';

describe('personal space', () => {
  test('isPersonalSpace returns true for space with personal tag', ({ expect }) => {
    const space = {
      tags: ['personal'],
      properties: {},
    } as any;
    expect(isPersonalSpace(space)).toBe(true);
  });

  test('isPersonalSpace returns true for space with legacy __DEFAULT__ property', ({ expect }) => {
    const space = {
      tags: [],
      properties: { __DEFAULT__: true },
    } as any;
    expect(isPersonalSpace(space)).toBe(true);
  });

  test('isPersonalSpace returns false for regular space', ({ expect }) => {
    const space = {
      tags: [],
      properties: {},
    } as any;
    expect(isPersonalSpace(space)).toBe(false);
  });

  test('hasTag checks for specific tag', ({ expect }) => {
    const space = {
      tags: ['personal', 'pinned'],
    } as any;
    expect(hasTag(space, 'personal')).toBe(true);
    expect(hasTag(space, 'pinned')).toBe(true);
    expect(hasTag(space, 'archived')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `moon run app-toolkit:test -- packages/sdk/app-toolkit/src/personal-space.test.ts`
Expected: FAIL — `hasTag` doesn't exist.

**Step 3: Update personal-space.ts**

```typescript
import { type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';

const DEFAULT_SPACE_KEY = '__DEFAULT__';

/** Check if a space has a specific tag. */
export const hasTag = (space: Pick<Space, 'tags'>, tag: string): boolean => space.tags.includes(tag);

/** Check if a space is the personal space. */
export const isPersonalSpace = (space: Pick<Space, 'tags' | 'properties'>): boolean =>
  hasTag(space, 'personal') || space.properties[DEFAULT_SPACE_KEY] === true;

/**
 * Mark a space as the personal space.
 * @deprecated Use `tags: ['personal']` when creating the space instead.
 */
export const setPersonalSpace = (space: Space): void => {
  Obj.change(space.properties, (properties) => {
    (properties as any)[DEFAULT_SPACE_KEY] = true;
  });
};

/** Find the personal space. */
export const getPersonalSpace = (client: { spaces: { get(): Space[] } }): Space | undefined =>
  client.spaces.get().find((space) => isPersonalSpace(space));
```

**Step 4: Run test to verify it passes**

Run: `moon run app-toolkit:test -- packages/sdk/app-toolkit/src/personal-space.test.ts`
Expected: PASS

**Step 5: Update callers that create personal spaces**

Search for `setPersonalSpace` usage in app code (e.g., `identity-created.ts`, `create.ts`). For new space creation paths, pass `tags: ['personal']` instead. Keep `setPersonalSpace` call alongside for backwards compatibility with existing spaces.

Key files to update:

- `packages/plugins/plugin-space/src/capabilities/identity-created/identity-created.ts`
- `packages/plugins/plugin-client/src/cli/commands/halo/create/create.ts`
- `packages/devtools/cli/src/commands/chat/chat.tsx`

In each, where `setPersonalSpace(space)` is called, also pass `tags: ['personal']` to the `create()` call:

```typescript
const space = await client.spaces.create({}, { tags: ['personal'] });
// Keep setPersonalSpace for existing spaces that don't have tags yet.
setPersonalSpace(space);
```

**Step 6: Build and test**

Run: `moon run app-toolkit:build && moon run app-toolkit:test`
Expected: PASS

**Step 7: Commit**

```
feat(app-toolkit): identify personal space via tags with legacy fallback
```

---

### Task 9: Export hasTag from app-toolkit and update barrel exports

**Files:**

- Modify: `packages/sdk/app-toolkit/src/index.ts` (or wherever the barrel export is)

**Step 1: Ensure hasTag is exported**

Check the barrel file and add `hasTag` to exports from `personal-space.ts` if not already re-exported.

**Step 2: Build full project**

Run: `moon exec --on-failure continue --quiet :build`
Expected: Build succeeds.

**Step 3: Run linter**

Run: `moon run :lint -- --fix`
Expected: No errors (or only pre-existing ones).

**Step 4: Commit**

```
feat(app-toolkit): export hasTag utility
```

---

### Task 10: Final verification

**Step 1: Run all tests in affected packages**

```bash
moon run credentials:test
moon run client-services:test
moon run app-toolkit:test
moon run client:test
```

**Step 2: Run full build**

Run: `moon exec --on-failure continue --quiet :build`
Expected: Build succeeds.

**Step 3: Run linter**

Run: `moon run :lint -- --fix`
Expected: Clean.
