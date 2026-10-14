# Invite Contacts to a Space — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add people from their derived contact book to a space, browse contacts on the account profile, and let the invitee join via a `?spaceKey=` link (phase 1 of the spec).

**Architecture:** The SDK already derives contacts (`useContacts`) and admits by identity key (`space.admitContact`); we add a `role` argument, presentational `ContactList`/`ContactPicker` in `@dxos/shell`, a Contacts account article and a `ContactPicker` surface in plugin-client, and an `AddMembers` operation, a join-URL builder, a `?spaceKey=` navigation branch and a surface slot in plugin-space.

**Tech Stack:** TypeScript, React, Effect, `@dxos/app-framework` surfaces/operations, buf protobuf types, vitest, Storybook, Playwright.

**Spec:** `agents/superpowers/specs/2026-09-24-space-invite-contact-picker-design.md`

## Global Constraints

- Work only in worktree `space-invite-contact-picker-2786df`, branch `claude/space-invite-contact-picker-2786df`; never create branches.
- Relative imports carry `.ts`/`.tsx`; import order builtin → external → `@dxos` → internal (`#…`) → parent → sibling.
- No `as any`, `as unknown as T`, or non-null `!` added to make types pass.
- New React components: arrow functions, named React imports, a `.stories.tsx` with `withTheme()` called.
- Account/settings articles use `Form.Root variant='settings'` + `Form.Viewport scroll` + `Form.Content`.
- Roles are `SpaceMember_Role` from `@dxos/client/echo`: `OWNER`, `ADMIN`, `EDITOR`, `READER`, `REMOVED`. The UI calls `READER` "Viewer". Default role for admission is `EDITOR`.
- Run a single test file with `pnpm --filter <pkg> exec vitest run <file>` (not `moon :test -- <file>`).
- `pnpm format` before every commit; commit messages `scope: description` ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Deviations from spec, all recorded in the spec by Task 3 Step 5:
  - The picker shows selection via checked items and a trigger summary, not chips, because `Combobox` is single-value and has no chip primitive.
  - The picker does not invoke `AddMembers` itself: plugin-space depends on plugin-client, so MembersContainer passes an `onAdd` callback in the slot data.
  - "Viewer" is `SpaceMember_Role.READER`.

## File map

| File                                                                                 | Change | Responsibility                                      |
| ------------------------------------------------------------------------------------ | ------ | --------------------------------------------------- |
| `packages/sdk/client-protocol/src/space.ts`                                          | modify | `admitContact(contact, role?)` signature            |
| `packages/sdk/client/src/echo/space-proxy.ts`                                        | modify | forward `role` (default `EDITOR`)                   |
| `packages/sdk/client-e2e/src/contact-book.test.ts`                                   | modify | role tests                                          |
| `packages/sdk/shell/src/util/profileString.ts`                                       | modify | accept any `{ profile }`                            |
| `packages/sdk/shell/src/components/IdentityList/IdentityListItem.tsx`                | modify | accept `Pick<Identity, 'identityKey' \| 'profile'>` |
| `packages/sdk/shell/src/components/ContactList/*`                                    | create | contact rows + shared-space chips                   |
| `packages/sdk/shell/src/components/ContactPicker/*`                                  | create | multi-select contact combobox                       |
| `packages/sdk/app-toolkit/src/ui/components/app-surface.ts`                          | modify | `ContactPicker` role                                |
| `packages/plugins/plugin-space/src/types/SpaceOperation.ts`                          | modify | `AddMembers` operation                              |
| `packages/plugins/plugin-space/src/operations/admit-contacts.ts` (+test)             | create | pure admission loop                                 |
| `packages/plugins/plugin-space/src/operations/add-members.ts`                        | create | operation handler                                   |
| `packages/plugins/plugin-space/src/capabilities/helpers.ts` (+test)                  | modify | `makeCreateJoinUrl`                                 |
| `packages/plugins/plugin-space/src/capabilities/navigation-handler/*`                | modify | `?spaceKey=` branch                                 |
| `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx` | modify | surface slot                                        |
| `packages/plugins/plugin-client/src/types/Account.ts`                                | modify | `Contacts` id                                       |
| `packages/plugins/plugin-client/src/capabilities/app-graph-builder.ts`               | modify | Contacts node                                       |
| `packages/plugins/plugin-client/src/capabilities/react-surface.ts`                   | modify | Contacts + ContactPicker surfaces                   |
| `packages/plugins/plugin-client/src/containers/ContactsContainer/*`                  | create | Contacts article                                    |
| `packages/plugins/plugin-client/src/containers/ContactPickerContainer/*`             | create | picker + role + Add                                 |
| `packages/plugins/plugin-client/src/translations.ts`                                 | modify | strings                                             |
| `packages/e2e/composer-e2e/src/playwright/contacts.spec.ts`                          | create | two-peer flow                                       |

---

### Task 1: `admitContact` takes a role

**Files:**

- Modify: `packages/sdk/client-protocol/src/space.ts:169`
- Modify: `packages/sdk/client/src/echo/space-proxy.ts:647-657`
- Test: `packages/sdk/client-e2e/src/contact-book.test.ts`

**Interfaces:**

- Produces: `Space.admitContact(contact: Contact, role?: SpaceMember_Role): Promise<void>` — `role` defaults to `SpaceMember_Role.EDITOR`.

- [ ] **Step 1: Write the failing tests** — add inside `describe('joinBySpaceKey', …)`:

```ts
test('admits with the requested role', async () => {
  const [client1, client2] = await createInitializedClients(2);
  const space1 = await client1.spaces.create();
  await inviteMember(space1, client2);
  const [contact] = await waitForContactBookSize(client1, 1);
  const space2 = await client1.spaces.create();
  await space2.admitContact(contact, SpaceMember_Role.READER);
  await joinSpaceAndCheck(space2, client2);
  expect(memberRole(space2, client2)).to.eq(SpaceMember_Role.READER);
});

test('admits as editor by default', async () => {
  const [client1, client2] = await createInitializedClients(2);
  const space1 = await client1.spaces.create();
  await inviteMember(space1, client2);
  const [contact] = await waitForContactBookSize(client1, 1);
  const space2 = await client1.spaces.create();
  await space2.admitContact(contact);
  await joinSpaceAndCheck(space2, client2);
  expect(memberRole(space2, client2)).to.eq(SpaceMember_Role.EDITOR);
});
```

Add the helper next to `findSpace`, and the import `import { SpaceMember_Role } from '@dxos/client/echo';`:

```ts
const memberRole = (space: Space, client: Client) => {
  const identityKey = requirePublicKey(client.halo.identity.get()?.identityKey);
  return space.members.get().find((member) => toPublicKey(member.identity?.identityKey)?.equals(identityKey))?.role;
};
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/client-e2e exec vitest run src/contact-book.test.ts`. Expected: the READER test fails (role is `ADMIN`) and the default test fails (`ADMIN` ≠ `EDITOR`). A TS error on the second argument is also acceptable evidence.

- [ ] **Step 3: Implement.** In `space.ts`:

```ts
  /** Admits a known identity directly, without an invitation; the guest completes with `joinBySpaceKey`. */
  admitContact(contact: Contact, role?: SpaceMember_Role): Promise<void>;
```

(import `type SpaceMember_Role` from `@dxos/protocols/buf/dxos/halo/credentials_pb` if not already imported). In `space-proxy.ts`:

```ts
  async admitContact(contact: Contact, role: SpaceMember_Role = SpaceMember_Role.EDITOR): Promise<void> {
    await runServiceCall(
      this._runtime,
      this._clientServices.rpc['SpacesService.admitContact']({ spaceKey: this.key, role, contact }),
      { label: 'SpacesService.admitContact' },
    );
  }
```

- [ ] **Step 4: Run, expect PASS** — same command; all `ContactBook` tests pass.
- [ ] **Step 5: Commit** — `git commit -m "client: admitContact takes a role, defaulting to editor"`.

---

### Task 2: `ContactList` in `@dxos/shell`

**Files:**

- Modify: `packages/sdk/shell/src/util/profileString.ts`, `packages/sdk/shell/src/components/IdentityList/IdentityListItem.tsx`
- Create: `packages/sdk/shell/src/components/ContactList/{ContactList.tsx,ContactList.stories.tsx,index.ts}`
- Modify: `packages/sdk/shell/src/components/index.ts`, `packages/sdk/shell/src/translations.ts`

**Interfaces:**

- Produces:
  - `type ContactSpace = { id: string; key: PublicKey; name?: string }`
  - `ContactList: (props: { contacts: Contact[]; spaces: ContactSpace[]; filter?: string; onSelectSpace?: (space: ContactSpace) => void }) => JSX.Element`
  - `filterContacts(contacts: Contact[], filter: string): Contact[]` — case-insensitive match on display name or identity-key hex.
  - `contactDisplayName(contact: Pick<Contact, 'identityKey' | 'profile'>): string`

- [ ] **Step 1: Widen identity props.** `profileString`:

```ts
export const profileString = (identity: Pick<Identity, 'profile'> | undefined, key: string): string | undefined => {
```

`IdentityListItem`: `identity: Pick<Identity, 'identityKey' | 'profile'>;`. Run `npx tsc --noEmit -p packages/sdk/shell/tsconfig.json` — expect PASS (widening only).

- [ ] **Step 2: Write the failing test** `packages/sdk/shell/src/components/ContactList/ContactList.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { contactDisplayName, filterContacts } from './ContactList.tsx';

const makeContact = (displayName?: string) =>
  create(ContactSchema, {
    identityKey: fromPublicKey(PublicKey.random()),
    profile: displayName ? create(ProfileDocumentSchema, { displayName }) : undefined,
  });

describe('filterContacts', () => {
  test('matches display name case-insensitively', () => {
    const alice = makeContact('Alice');
    expect(filterContacts([alice, makeContact('Bob')], 'ali')).toEqual([alice]);
  });

  test('matches identity key hex', () => {
    const bob = makeContact('Bob');
    const hex = contactKeyHex(bob).slice(0, 8);
    expect(filterContacts([makeContact('Alice'), bob], hex)).toEqual([bob]);
  });

  test('empty filter returns all', () => {
    const contacts = [makeContact('A'), makeContact('B')];
    expect(filterContacts(contacts, '')).toEqual(contacts);
  });

  test('falls back to a generated name', () => {
    expect(contactDisplayName(makeContact())).not.toEqual('');
  });
});
```

(also import `contactKeyHex` from `./ContactList.tsx`).

- [ ] **Step 3: Run, expect FAIL** — `pnpm --filter @dxos/shell exec vitest run src/components/ContactList/ContactList.test.ts` → module not found.

- [ ] **Step 4: Implement** `ContactList.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { type PublicKey } from '@dxos/keys';
import { requirePublicKey, toPublicKey } from '@dxos/protocols/buf';
import { type Contact } from '@dxos/react-client/halo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { translationKey } from '../../translations.ts';
import { IdentityListItem } from '../IdentityList/index.ts';

export type ContactSpace = { id: string; key: PublicKey; name?: string };

export type ContactListProps = {
  contacts: Contact[];
  spaces: ContactSpace[];
  filter?: string;
  onSelectSpace?: (space: ContactSpace) => void;
};

export const contactKeyHex = (contact: Pick<Contact, 'identityKey'>): string =>
  requirePublicKey(contact.identityKey).toHex();

export const contactDisplayName = (contact: Pick<Contact, 'identityKey' | 'profile'>): string =>
  contact.profile?.displayName ?? generateName(contactKeyHex(contact));

export const filterContacts = (contacts: Contact[], filter: string): Contact[] => {
  const query = filter.trim().toLowerCase();
  if (!query) {
    return contacts;
  }
  return contacts.filter(
    (contact) => contactDisplayName(contact).toLowerCase().includes(query) || contactKeyHex(contact).includes(query),
  );
};

export const ContactList = ({ contacts, spaces, filter = '', onSelectSpace }: ContactListProps) => {
  const { t } = useTranslation(translationKey);
  const visible = useMemo(
    () => filterContacts(contacts, filter).sort((a, b) => contactDisplayName(a).localeCompare(contactDisplayName(b))),
    [contacts, filter],
  );

  if (visible.length === 0) {
    return <p className='text-description text-center my-2'>{t('empty-contacts.message')}</p>;
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames='flex flex-col gap-2' aria-label={t('contacts.label')} data-testid='contact-list'>
        {visible.map((contact) => {
          const common = (contact.commonSpaces ?? [])
            .map((key) => spaces.find((space) => toPublicKey(key)?.equals(space.key)))
            .filter((space): space is ContactSpace => space !== undefined);
          return (
            <div key={contactKeyHex(contact)} className='flex flex-col gap-1'>
              <IdentityListItem identity={contact} />
              <div className='flex flex-wrap gap-1 ps-12'>
                {common.map((space) => (
                  <Button
                    key={space.id}
                    variant='ghost'
                    density='fine'
                    onClick={() => onSelectSpace?.(space)}
                    data-testid='contact-list.space'
                  >
                    {space.name ?? t('unnamed-space.label')}
                  </Button>
                ))}
              </div>
            </div>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};
```

`index.ts`: `export * from './ContactList.tsx';`. Add `export * from './ContactList/index.ts';` to `components/index.ts`. Add to the `en-US` block of `packages/sdk/shell/src/translations.ts`: `'contacts.label': 'Contacts'`, `'empty-contacts.message': 'No contacts yet — people appear here once you share a space with them.'`, `'unnamed-space.label': 'Untitled space'`.

- [ ] **Step 5: Run, expect PASS** — the vitest command from Step 3.

- [ ] **Step 6: Story** `ContactList.stories.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations.ts';
import { ContactList, type ContactSpace } from './ContactList.tsx';

const spaces: ContactSpace[] = [
  { id: 'a', key: PublicKey.random(), name: 'Design' },
  { id: 'b', key: PublicKey.random(), name: 'Engineering' },
];

const contacts = ['Alice', 'Bob', 'Carol'].map((displayName, index) =>
  create(ContactSchema, {
    identityKey: fromPublicKey(PublicKey.random()),
    profile: create(ProfileDocumentSchema, { displayName }),
    commonSpaces: spaces.slice(0, index + 1).map((space) => fromPublicKey(space.key)),
  }),
);

const meta = {
  title: 'sdk/shell/ContactList',
  component: ContactList,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof ContactList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { contacts, spaces } };

export const Filtered: Story = { args: { contacts, spaces, filter: 'bo' } };

export const Empty: Story = { args: { contacts: [], spaces } };
```

Check `translations` is the export name in `packages/sdk/shell/src/translations.ts` (adjust the import if it differs).

- [ ] **Step 7: Verify** — `npx tsc --noEmit -p packages/sdk/shell/tsconfig.json` passes; open `sdk/shell/ContactList` in storybook on 9009 (reuse the running server per AGENTS.md) and confirm three stories render with no console errors.
- [ ] **Step 8: Commit** — `git commit -m "shell: add ContactList"`.

---

### Task 3: `ContactPicker` in `@dxos/shell`

**Files:**

- Create: `packages/sdk/shell/src/components/ContactPicker/{ContactPicker.tsx,ContactPicker.stories.tsx,index.ts}`
- Modify: `packages/sdk/shell/src/components/index.ts`, `packages/sdk/shell/src/translations.ts`

**Interfaces:**

- Consumes: `contactKeyHex`, `contactDisplayName`, `filterContacts` (Task 2).
- Produces: `ContactPicker: (props: { contacts: Contact[]; excludeKeys?: string[]; value: string[]; onChange: (keys: string[]) => void; disabled?: boolean }) => JSX.Element` — `value`/`excludeKeys` are identity-key hex strings.

- [ ] **Step 1: Implement** `ContactPicker.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type Contact } from '@dxos/react-client/halo';
import { useTranslation } from '@dxos/react-ui';
import { Combobox } from '@dxos/react-ui-list';

import { translationKey } from '../../translations.ts';
import { contactDisplayName, contactKeyHex, filterContacts } from '../ContactList/index.ts';

export type ContactPickerProps = {
  contacts: Contact[];
  /** Identity-key hex of people who must not be offered (e.g. existing members). */
  excludeKeys?: string[];
  /** Selected identity-key hex strings. */
  value: string[];
  onChange: (keys: string[]) => void;
  disabled?: boolean;
};

export const ContactPicker = ({ contacts, excludeKeys = [], value, onChange, disabled }: ContactPickerProps) => {
  const { t } = useTranslation(translationKey);
  const [query, setQuery] = useState('');
  const candidates = useMemo(
    () =>
      filterContacts(
        contacts.filter((contact) => !excludeKeys.includes(contactKeyHex(contact))),
        query,
      ),
    [contacts, excludeKeys, query],
  );
  const selectedNames = contacts
    .filter((contact) => value.includes(contactKeyHex(contact)))
    .map(contactDisplayName)
    .join(', ');

  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((selected) => selected !== key) : [...value, key]);

  return (
    <Combobox.Root placeholder={t('contact-picker.placeholder')} displayValue={selectedNames} value={value.join(',')}>
      <Combobox.Trigger disabled={disabled} data-testid='contact-picker.trigger' />
      <Combobox.Content>
        <Combobox.Input placeholder={t('contact-picker.search')} value={query} onValueChange={setQuery} />
        <Combobox.List>
          {candidates.map((contact) => {
            const key = contactKeyHex(contact);
            return (
              <Combobox.Item
                key={key}
                value={key}
                label={contactDisplayName(contact)}
                checked={value.includes(key)}
                closeOnSelect={false}
                onSelect={() => toggle(key)}
                data-testid='contact-picker.item'
              />
            );
          })}
        </Combobox.List>
        {candidates.length === 0 && <Combobox.Empty>{t('contact-picker.empty')}</Combobox.Empty>}
      </Combobox.Content>
    </Combobox.Root>
  );
};
```

If `Combobox.Item` does not forward `data-testid`, drop it and target items by role in the play test. `index.ts` → `export * from './ContactPicker.tsx';`; add to `components/index.ts`. Translations: `'contact-picker.placeholder': 'Choose people'`, `'contact-picker.search': 'Search contacts…'`, `'contact-picker.empty': 'No matching contacts.'`.

- [ ] **Step 2: Story with a play test** `ContactPicker.stories.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations.ts';
import { contactKeyHex } from '../ContactList/index.ts';
import { ContactPicker } from './ContactPicker.tsx';

const contacts = ['Alice', 'Bob', 'Carol'].map((displayName) =>
  create(ContactSchema, {
    identityKey: fromPublicKey(PublicKey.random()),
    profile: create(ProfileDocumentSchema, { displayName }),
  }),
);

const DefaultStory = ({ excludeKeys }: { excludeKeys?: string[] }) => {
  const [value, setValue] = useState<string[]>([]);
  return (
    <>
      <ContactPicker contacts={contacts} excludeKeys={excludeKeys} value={value} onChange={setValue} />
      <output data-testid='contact-picker.value'>{value.length}</output>
    </>
  );
};

const meta = {
  title: 'sdk/shell/ContactPicker',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TestSelectAndExclude: Story = {
  args: { excludeKeys: [contactKeyHex(contacts[2])] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('contact-picker.trigger'));
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.queryByText('Carol')).toBeNull();
    await userEvent.click(await body.findByText('Alice'));
    await userEvent.click(await body.findByText('Bob'));
    await expect(canvas.getByTestId('contact-picker.value')).toHaveTextContent('2');
    await userEvent.type(body.getByPlaceholderText('Search contacts…'), 'bo');
    await expect(body.queryByText('Alice')).toBeNull();
  },
};
```

- [ ] **Step 3: Run the play test, expect PASS** — `pnpm --filter @dxos/shell exec vitest run --project=storybook src/components/ContactPicker` (use the package's storybook vitest project name from its `vitest.config.ts`; if none exists, run the story in the 9009 storybook's Interactions panel and screenshot the pass). If it fails, fix the component, not the test.
- [ ] **Step 4: Verify types** — `npx tsc --noEmit -p packages/sdk/shell/tsconfig.json`.
- [ ] **Step 5: Update the spec** — in §2 replace "selections render as removable chips" with "selections show as checked items and a comma-separated trigger summary"; replace "**Add** invokes `SpaceOperation.AddMembers`" with "**Add** calls the slot's `onAdd`, which MembersContainer implements with `SpaceOperation.AddMembers` (plugin-client cannot import plugin-space)"; and write "Viewer (`READER`)" where the spec says Viewer.
- [ ] **Step 6: Commit** — `git commit -m "shell: add ContactPicker"`.

---

### Task 4: `AddMembers` operation and join URL (plugin-space)

**Files:**

- Modify: `packages/plugins/plugin-space/src/types/SpaceOperation.ts` (after `Share`)
- Create: `packages/plugins/plugin-space/src/operations/admit-contacts.ts`, `admit-contacts.test.ts`, `add-members.ts`
- Modify: `packages/plugins/plugin-space/src/operations/SpaceOperationHandlerSet.ts`
- Modify: `packages/plugins/plugin-space/src/capabilities/helpers.ts` (+ create `helpers.test.ts`), `operations/helpers.ts` (`SpaceOperationConfig`), `capabilities/index.ts` (UndoMappings props), `capabilities/undo-mappings.ts`

**Interfaces:**

- Consumes: `space.admitContact(contact, role)` (Task 1).
- Produces:
  - `SpaceOperation.AddMembers` — input `{ space: SpaceSchema; identityKeys: string[]; role: SpaceMember_Role }`, output `{ joinUrl: string; admitted: string[]; failed: { key: string; error: string }[] }`.
  - `admitContacts(space: Pick<Space, 'admitContact'>, identityKeys: string[], role): Promise<{ admitted: string[]; failed: { key: string; error: string }[] }>`
  - `makeCreateJoinUrl(options: SpacePluginOptions): (spaceKey: PublicKey) => string` — sets query param `options.joinSpaceKeyProp ?? 'spaceKey'`.
  - `SpaceOperationConfig.createJoinUrl: (spaceKey: PublicKey) => string`.

- [ ] **Step 1: Write failing tests.** `operations/admit-contacts.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { SpaceMember_Role } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { requirePublicKey } from '@dxos/protocols/buf';

import { admitContacts } from './admit-contacts.ts';

describe('admitContacts', () => {
  test('admits every key with the role and reports failures without stopping', async () => {
    const [ok1, bad, ok2] = [PublicKey.random(), PublicKey.random(), PublicKey.random()].map((key) => key.toHex());
    const calls: { key: string; role: SpaceMember_Role | undefined }[] = [];
    const space = {
      admitContact: async (contact: Contact, role?: SpaceMember_Role) => {
        const key = requirePublicKey(contact.identityKey).toHex();
        calls.push({ key, role });
        if (key === bad) {
          throw new Error('denied');
        }
      },
    };
    const result = await admitContacts(space, [ok1, bad, ok2], SpaceMember_Role.READER);
    expect(result.admitted).toEqual([ok1, ok2]);
    expect(result.failed).toEqual([{ key: bad, error: 'denied' }]);
    expect(calls.map((call) => call.role)).toEqual([
      SpaceMember_Role.READER,
      SpaceMember_Role.READER,
      SpaceMember_Role.READER,
    ]);
  });
});
```

Import `type Contact` from `@dxos/client/halo`.

`capabilities/helpers.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { makeCreateJoinUrl } from './helpers.ts';

describe('makeCreateJoinUrl', () => {
  test('puts the space key in the spaceKey param', () => {
    const key = PublicKey.random();
    const url = new URL(makeCreateJoinUrl({ shareableLinkOrigin: 'https://composer.space' })(key));
    expect(url.origin).toBe('https://composer.space');
    expect(url.searchParams.get('spaceKey')).toBe(key.toHex());
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-space exec vitest run src/operations/admit-contacts.test.ts src/capabilities/helpers.test.ts`.

- [ ] **Step 3: Implement.** `admit-contacts.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Space, type SpaceMember_Role } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import { ContactSchema } from '@dxos/protocols/buf/dxos/client/services_pb';

export type AdmitContactsResult = { admitted: string[]; failed: { key: string; error: string }[] };

/** Admits sequentially so one rejected key is reported without abandoning the rest. */
export const admitContacts = async (
  space: Pick<Space, 'admitContact'>,
  identityKeys: string[],
  role: SpaceMember_Role,
): Promise<AdmitContactsResult> => {
  const result: AdmitContactsResult = { admitted: [], failed: [] };
  for (const key of identityKeys) {
    try {
      await space.admitContact(create(ContactSchema, { identityKey: fromPublicKey(PublicKey.from(key)) }), role);
      result.admitted.push(key);
    } catch (error) {
      result.failed.push({ key, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return result;
};
```

In `capabilities/helpers.ts` add, and add `joinSpaceKeyProp?: string` (JSDoc "Query parameter carrying a space key to join by admission.") to `SpacePluginOptions` in `types/SpaceSchema.ts`:

```ts
export const makeCreateJoinUrl =
  ({
    shareableLinkOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    invitationPath = '/',
    joinSpaceKeyProp = 'spaceKey',
  }: SpaceSchema.SpacePluginOptions) =>
  (spaceKey: PublicKey) => {
    const baseUrl = new URL(invitationPath || '/', shareableLinkOrigin);
    baseUrl.searchParams.set(joinSpaceKeyProp, spaceKey.toHex());
    return baseUrl.toString();
  };
```

Extend `SpaceOperationConfig` in `operations/helpers.ts` with `createJoinUrl: (spaceKey: PublicKey) => string;`; in `capabilities/index.ts` UndoMappings props add `createJoinUrl: makeCreateJoinUrl(options)`; in `undo-mappings.ts` accept `createJoinUrl` in the options type and contribute `{ createInvitationUrl, createJoinUrl }`.

In `types/SpaceOperation.ts` (import `SpaceMember_Role` from `@dxos/client/echo`):

```ts
export const AddMembers = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.space.addMembers'),
    name: 'Add Members',
    description: 'Admit known contacts to a space by identity key.',
    icon: 'ph--user-plus--regular',
  },
  input: Schema.Struct({
    space: SpaceSchema,
    identityKeys: Schema.Array(Schema.String),
    role: Schema.Enum(SpaceMember_Role),
  }),
  output: Schema.Struct({
    joinUrl: Schema.String,
    admitted: Schema.Array(Schema.String),
    failed: Schema.Array(Schema.Struct({ key: Schema.String, error: Schema.String })),
  }),
});
```

`operations/add-members.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { SpaceOperation } from '#types';

import { admitContacts } from './admit-contacts.ts';
import { SpaceOperationConfig } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.AddMembers> = SpaceOperation.AddMembers.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ space, identityKeys, role }) {
      const result = yield* Effect.promise(() => admitContacts(space, [...identityKeys], role));
      const { createJoinUrl } = yield* Capability.get(SpaceOperationConfig);
      return { joinUrl: createJoinUrl(space.key), ...result };
    }),
  ),
);
export default handler;
```

Register in `SpaceOperationHandlerSet.ts` in alphabetical position:
`SpaceOperation.AddMembers.pipe(Operation.lazyHandler(() => import('./add-members.ts'))),`

- [ ] **Step 4: Run, expect PASS** — Step 2 command; then `npx tsc --noEmit -p packages/plugins/plugin-space/tsconfig.json`.
- [ ] **Step 5: Commit** — `git commit -m "plugin-space: add AddMembers operation and join-by-key URL"`.

---

### Task 5: `?spaceKey=` navigation (plugin-space)

**Files:**

- Modify: `packages/plugins/plugin-space/src/capabilities/navigation-handler/navigation-handler.ts`, `navigation-handler/index.ts`
- Create: `packages/plugins/plugin-space/src/capabilities/navigation-handler/join-space-key.ts`, `join-space-key.test.ts`
- Modify: `packages/plugins/plugin-space/src/translations.ts`

**Interfaces:**

- Consumes: `joinSpaceKeyProp` option (Task 4).
- Produces: `readJoinSpaceKey(url: URL, prop: string): PublicKey | undefined`; `JOIN_BY_KEY_TIMEOUT = 60_000`.

- [ ] **Step 1: Failing test** `join-space-key.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { readJoinSpaceKey } from './join-space-key.ts';

describe('readJoinSpaceKey', () => {
  test('reads a valid key', () => {
    const key = PublicKey.random();
    expect(readJoinSpaceKey(new URL(`https://x/?spaceKey=${key.toHex()}`), 'spaceKey')?.equals(key)).toBe(true);
  });

  test('ignores missing and malformed values', () => {
    expect(readJoinSpaceKey(new URL('https://x/'), 'spaceKey')).toBeUndefined();
    expect(readJoinSpaceKey(new URL('https://x/?spaceKey=nope'), 'spaceKey')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run, expect FAIL** — `pnpm --filter @dxos/plugin-space exec vitest run src/capabilities/navigation-handler/join-space-key.test.ts`.

- [ ] **Step 3: Implement** `join-space-key.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';

/** How long to wait for an online member to hand over the admission credential. */
export const JOIN_BY_KEY_TIMEOUT = 60_000;

export const readJoinSpaceKey = (url: URL, prop: string): PublicKey | undefined => {
  const value = url.searchParams.get(prop);
  return value && PublicKey.isPublicKey(value) ? PublicKey.from(value) : undefined;
};
```

(If `PublicKey.isPublicKey` does not accept hex strings, use `/^[0-9a-f]{64}$/i.test(value)`.)

In `navigation-handler.ts` add option `joinSpaceKeyProp = 'spaceKey'` to `NavigationHandlerOptions`, and at the top of `handler`, before the invitation-code branch:

```ts
const joinSpaceKey = readJoinSpaceKey(url, joinSpaceKeyProp);
if (joinSpaceKey) {
  yield * Effect.promise(() => client.waitUntilInitialized({ timeout: INITIALIZE_TIMEOUT }));
  if (Option.isNone(yield * Identity.getSnapshot.pipe(Effect.provide(HaloServicesLayer)))) {
    return;
  }
  removeQueryParam(joinSpaceKeyProp);
  const existing = client.spaces.get().find((space) => space.key.equals(joinSpaceKey));
  const space =
    existing ??
    yield *
      Effect.tryPromise(() => client.spaces.joinBySpaceKey(joinSpaceKey)).pipe(Effect.timeout(JOIN_BY_KEY_TIMEOUT));
  yield * Operation.invoke(SpaceOperation.Open, { space });
  return;
}
```

A timeout or rejection falls into the existing `Effect.catch`, which shows the navigation-failed toast. Change that toast to take its keys from the error: when the failure came from the join-by-key branch use `join-by-key-failed-toast.title` / `.description`. Implement by wrapping the branch in `Effect.catch` that invokes `LayoutOperation.AddToast` with those keys and returns. Add translations: `'join-by-key-failed-toast.title': 'Couldn’t join space'`, `'join-by-key-failed-toast.description': 'Couldn’t reach a member of this space — try again later.'`.

In `navigation-handler/index.ts` props: `({ invitationProp: options.invitationProp, joinSpaceKeyProp: options.joinSpaceKeyProp })`.

- [ ] **Step 4: Run, expect PASS** — Step 2 command; `npx tsc --noEmit -p packages/plugins/plugin-space/tsconfig.json`.
- [ ] **Step 5: Commit** — `git commit -m "plugin-space: join a space from a ?spaceKey= link"`.

---

### Task 6: Contacts article (plugin-client)

**Files:**

- Modify: `packages/plugins/plugin-client/src/types/Account.ts`, `capabilities/app-graph-builder.ts`, `capabilities/react-surface.ts`, `containers/index.ts`, `translations.ts`
- Create: `packages/plugins/plugin-client/src/containers/ContactsContainer/{ContactsContainer.tsx,ContactsContainer.stories.tsx,index.ts}`

**Interfaces:**

- Consumes: `ContactList`, `ContactSpace` (Task 2).
- Produces: `Account.Contacts = 'contacts'`; default-exported `ContactsContainer`.

- [ ] **Step 1: Account id.** In `Account.ts` after `Devices`: `export const Contacts = 'contacts';`.

- [ ] **Step 2: Graph node.** In `app-graph-builder.ts` after `accountDevices`:

```ts
const accountContacts =
  yield *
  AppGraphBuilder.createExtension({
    id: 'accountContacts',
    url: { key: Account.Contacts, kind: 'singleton', path: [] },
    match: GraphNodeMatcher.whenId(Account.workspacePath),
    connector: () =>
      Effect.succeed([
        AppGraphNode.make({
          id: Account.Contacts,
          data: Account.path(Account.Contacts),
          type: meta.profile.key,
          properties: {
            label: ['contacts.label', { ns: meta.profile.key }],
            icon: 'ph--address-book--regular',
            testId: 'clientPlugin.contacts',
          },
        }),
      ]),
  });
```

and add `...accountContacts,` after `...accountDevices,` in the contribute array.

- [ ] **Step 3: Container** `ContactsContainer.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { useSpaces } from '@dxos/react-client/echo';
import { useContacts } from '@dxos/react-client/halo';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { ContactList, type ContactSpace } from '@dxos/shell/react';

import { meta } from '#meta';

export const ContactsContainer = () => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const contacts = useContacts();
  const spaces = useSpaces();
  const [filter, setFilter] = useState('');
  const contactSpaces = useMemo(
    (): ContactSpace[] => spaces.map((space) => ({ id: space.id, key: space.key, name: space.properties.name })),
    [spaces],
  );

  const handleSelectSpace = (selected: ContactSpace) =>
    void invokePromise(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(selected.id) });

  return (
    <Form.Root variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={t('contacts.label')} description={t('contacts.description')}>
            <Input.Root>
              <Input.TextInput
                placeholder={t('contacts-search.placeholder')}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                data-testid='contacts.search'
              />
            </Input.Root>
            <ContactList contacts={contacts} spaces={contactSpaces} filter={filter} onSelectSpace={handleSelectSpace} />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
```

Add imports `import * as GraphPath from '@dxos/app-toolkit/GraphPath';` and `import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';`. plugin-client must not import plugin-space, because plugin-space depends on plugin-client; `SwitchWorkspace` with `GraphPath.getSpacePath(id)` is how plugin-space itself switches (`capabilities/spaces-available.ts:117`).

`index.ts`: `export { ContactsContainer as default } from './ContactsContainer.tsx';`. `containers/index.ts`: `export const ContactsContainer: ComponentType<any> = lazy(() => import('./ContactsContainer/index.ts'));`.

- [ ] **Step 4: Surface.** In `react-surface.ts` after the Devices surface:

```ts
      Surface.create({
        id: Account.Contacts,
        filter: AppSurface.literal(AppSurface.Article, Account.path(Account.Contacts)),
        component: ContactsContainer,
      }),
```

- [ ] **Step 5: Translations** (plugin-client `translations.ts`): `'contacts.label': 'Contacts'`, `'contacts.description': 'People you share at least one space with.'`, `'contacts-search.placeholder': 'Search contacts…'`.

- [ ] **Step 6: Story** `ContactsContainer.stories.tsx` — copy the decorator/setup pattern from `DevicesContainer.stories.tsx` (client with identity) and render `<ContactsContainer />`; title `plugins/plugin-client/containers/ContactsContainer`.

- [ ] **Step 7: Verify** — `npx tsc --noEmit -p packages/plugins/plugin-client/tsconfig.json`; `pnpm --filter @dxos/plugin-client exec vitest run src/plugin.test.ts`; storybook renders the story with no console errors (empty state is expected with one identity).
- [ ] **Step 8: Commit** — `git commit -m "plugin-client: add Contacts account article"`.

---

### Task 7: `ContactPicker` surface and members-article slot

**Files:**

- Modify: `packages/sdk/app-toolkit/src/ui/components/app-surface.ts`
- Create: `packages/plugins/plugin-client/src/containers/ContactPickerContainer/{ContactPickerContainer.tsx,ContactPickerContainer.stories.tsx,index.ts}`
- Modify: `packages/plugins/plugin-client/src/containers/index.ts`, `capabilities/react-surface.ts`, `translations.ts`
- Modify: `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx`, `packages/plugins/plugin-space/src/translations.ts`

**Interfaces:**

- Consumes: `ContactPicker` (Task 3), `SpaceOperation.AddMembers` (Task 4). plugin-client cannot import plugin-space (the dependency runs the other way), so MembersContainer invokes `AddMembers` itself and hands the picker an `onAdd` callback in the slot data.
- Produces:
  - `AppSurface.ContactPicker: Role.Role<ContactPickerData>`
  - `type ContactPickerData = { space: Space; onAdd: (identityKeys: string[], role: SpaceMember_Role) => Promise<{ joinUrl: string; failed: { key: string; error: string }[] }> }`

- [ ] **Step 1: Role.** In `app-surface.ts` near `NavtreeItemEnd` (import `type SpaceMember_Role` from `@dxos/client/echo`):

```ts
/** Data for the contact-picker slot on a space's members article. */
export type ContactPickerData = {
  space: Space;
  onAdd: (
    identityKeys: string[],
    role: SpaceMember_Role,
  ) => Promise<{ joinUrl: string; failed: { key: string; error: string }[] }>;
};

/** Slot for choosing known contacts to admit to a space; filled by the client plugin. */
export const ContactPicker: Role.Role<ContactPickerData> = Role.make('org.dxos.role.contactPicker');
```

- [ ] **Step 2: Container** `ContactPickerContainer.tsx`:

```tsx
//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { SpaceMember_Role, useMembers } from '@dxos/react-client/echo';
import { useContacts, useIdentity } from '@dxos/react-client/halo';
import { toPublicKey } from '@dxos/protocols/buf';
import { Button, Clipboard, Input, Select, useTranslation } from '@dxos/react-ui';
import { ContactPicker } from '@dxos/shell/react';

import { meta } from '#meta';

const ROLES = [SpaceMember_Role.EDITOR, SpaceMember_Role.READER, SpaceMember_Role.ADMIN] as const;
const roleLabel: Record<(typeof ROLES)[number], string> = {
  [SpaceMember_Role.EDITOR]: 'role-editor.label',
  [SpaceMember_Role.READER]: 'role-viewer.label',
  [SpaceMember_Role.ADMIN]: 'role-admin.label',
};

export type ContactPickerContainerProps = AppSurface.ContactPickerData;

export const ContactPickerContainer = ({ space, onAdd }: ContactPickerContainerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const contacts = useContacts();
  const members = useMembers(space.key);
  const identity = useIdentity();
  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState<(typeof ROLES)[number]>(SpaceMember_Role.EDITOR);
  const [joinUrl, setJoinUrl] = useState<string>();
  const [pending, setPending] = useState(false);

  const memberKeys = useMemo(
    () =>
      members.map((member) => toPublicKey(member.identity?.identityKey)?.toHex()).filter((key) => key !== undefined),
    [members],
  );
  const selfRole = members.find((member) =>
    toPublicKey(member.identity?.identityKey)?.equals(toPublicKey(identity?.identityKey) ?? ''),
  )?.role;
  const canAdmit = selfRole === SpaceMember_Role.OWNER || selfRole === SpaceMember_Role.ADMIN;

  const handleAdd = async () => {
    setPending(true);
    try {
      const result = await onAdd(selected, role);
      setJoinUrl(result.joinUrl);
      setSelected(result.failed.map((failure) => failure.key));
    } finally {
      setPending(false);
    }
  };

  if (contacts.length === 0) {
    return <p className='text-description'>{t('contact-picker-empty.message')}</p>;
  }

  return (
    <Clipboard.Provider>
      <div role='group' className='flex flex-col gap-2'>
        <ContactPicker
          contacts={contacts}
          excludeKeys={memberKeys}
          value={selected}
          onChange={(keys) => {
            setSelected(keys);
            setJoinUrl(undefined);
          }}
          disabled={!canAdmit}
        />
        <div className='flex gap-2'>
          <Select.Root value={String(role)} onValueChange={(value) => setRole(Number(value) as (typeof ROLES)[number])}>
            <Select.TriggerButton disabled={!canAdmit} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {ROLES.map((value) => (
                    <Select.Option key={value} value={String(value)}>
                      {t(roleLabel[value])}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Button
            disabled={!canAdmit || pending || selected.length === 0}
            onClick={handleAdd}
            data-testid='contactPicker.add'
          >
            {t('contact-picker-add.label')}
          </Button>
        </div>
        {joinUrl && (
          <div className='flex gap-2'>
            <Input.Root>
              <Input.TextInput readOnly value={joinUrl} data-testid='contactPicker.joinUrl' />
            </Input.Root>
            <Clipboard.Button value={joinUrl} />
          </div>
        )}
      </div>
    </Clipboard.Provider>
  );
};
```

Before writing, check two things and adjust to the real API: `Select` sub-component names (`grep -n "export const Select" -A30 packages/ui/react-ui/src/components/Select/Select.tsx`), and the `(typeof ROLES)[number]` narrowing from `Number(value)`. If that needs a cast, replace it with `ROLES.find((candidate) => String(candidate) === value) ?? SpaceMember_Role.EDITOR`, which needs no cast. Fix `toPublicKey(...) ?? ''` the same way: compute `const selfKey = toPublicKey(identity?.identityKey);` and compare `selfKey && …equals(selfKey)`.

`index.ts` default export; add a lazy export to `containers/index.ts`.

- [ ] **Step 3: Surface** in plugin-client `react-surface.ts`:

```ts
      Surface.create({
        id: 'contactPicker',
        filter: Surface.makeFilter(AppSurface.ContactPicker),
        component: ContactPickerContainer,
        props: ({ data }) => data,
      }),
```

Check the `props` mapper signature against the `JOIN_DIALOG` entry in the same file and match it.

- [ ] **Step 4: Translations** (plugin-client): `'contact-picker-add.label': 'Add'`, `'contact-picker-empty.message': 'No contacts yet — people appear here once you share a space with them.'`, `'role-editor.label': 'Editor'`, `'role-viewer.label': 'Viewer'`, `'role-admin.label': 'Admin'`.

- [ ] **Step 5: Slot in MembersContainer.** Add imports `import { Surface } from '@dxos/app-framework/ui';` and `import { type SpaceMember_Role } from '@dxos/react-client/echo';`. Inside the component:

```tsx
const contactPickerData = useMemo(
  (): AppSurface.ContactPickerData => ({
    space,
    onAdd: async (identityKeys: string[], role: SpaceMember_Role) => {
      const { data } = await invokePromise(SpaceOperation.AddMembers, { space, identityKeys, role });
      return data ?? { joinUrl: '', failed: identityKeys.map((key) => ({ key, error: 'failed' })) };
    },
  }),
  [space, invokePromise],
);
```

Render between the members group and the invitations group:

```tsx
<div role='group' className='min-w-0'>
  <h3 className='text-lg mb-2'>{t('add-known-people.label')}</h3>
  <Surface.Surface type={AppSurface.ContactPicker} data={contactPickerData} limit={1} />
</div>
```

After `onAdd` returns failures, show a toast from the container. Wrap `onAdd` so that when `failed.length > 0` it calls `invokePromise(LayoutOperation.AddToast, { id: `${meta.profile.key}/add-members-failed`, title: ['add-members-failed-toast.title', { ns: meta.profile.key }], icon: 'ph--warning--regular' })`. plugin-space translations: `'add-known-people.label': 'Add people you know'`, `'add-members-failed-toast.title': 'Some people could not be added'`.

- [ ] **Step 6: Stories.** `ContactPickerContainer.stories.tsx` renders the container with a stub `onAdd` that resolves `{ joinUrl: 'https://composer.space/?spaceKey=…', failed: [] }`, using the DevicesContainer client setup. Extend the existing MembersContainer story (if one exists — `ls packages/plugins/plugin-space/src/containers/MembersContainer`) so the slot is filled. If no story exists, add a minimal one with plugin-client's ContactPicker surface contributed.
- [ ] **Step 7: Verify** — `npx tsc --noEmit` for app-toolkit, plugin-client and plugin-space; `moon run plugin-client:lint plugin-space:lint`; the storybook renders both stories without console errors.
- [ ] **Step 8: Commit** — `git commit -m "plugin-client, plugin-space: contact picker on the members article"`.

---

### Task 8: Two-peer end-to-end test

**Files:**

- Create: `packages/e2e/composer-e2e/src/playwright/contacts.spec.ts`
- Modify: `packages/e2e/composer-e2e/src/playwright/app-manager.ts` (helpers)

**Interfaces:**

- Consumes: test ids `contact-picker.trigger`, `contactPicker.add`, `contactPicker.joinUrl` (Task 7) and the existing `AppManager` helpers `createSpace`, `shareSpace`, `createSpaceInvitation`, `getAuthCode`, `joinSpace`, `shell.acceptSpaceInvitation`, `shell.authenticate`, `waitForSpaceReady`, `workspaceId`.

- [ ] **Step 1: Write the test**:

```ts
//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { AppManager } from './app-manager.ts';

test.describe('Contacts', () => {
  let host: AppManager;
  let guest: AppManager;

  test.beforeEach(async ({ browser }) => {
    test.setTimeout(120_000);
    host = new AppManager(browser, false);
    guest = new AppManager(browser, false);
    await host.init();
    await guest.init();
  });

  test.afterEach(async () => {
    if (host !== undefined && guest !== undefined) {
      await Promise.all([host.close(), guest.close()]);
    }
  });

  test('host adds a known contact to a second space', async () => {
    // Space A: establish the contact via a normal invitation.
    await host.createSpace();
    const spaceA = host.workspaceId;
    await host.shareSpace();
    const invitationCode = await host.createSpaceInvitation();
    const authCode = await host.getAuthCode();
    await guest.joinSpace();
    await guest.shell.acceptSpaceInvitation(invitationCode);
    await guest.shell.authenticate(authCode);
    await expect.poll(() => guest.workspaceId, { timeout: 30_000 }).toBe(spaceA);

    // Space B: add the guest from the contact picker.
    await host.createSpace();
    const spaceB = host.workspaceId;
    await host.shareSpace();
    await host.page.getByTestId('contact-picker.trigger').click();
    await host.page.getByRole('option').first().click();
    await host.page.keyboard.press('Escape');
    await host.page.getByTestId('contactPicker.add').click();
    const joinUrl = await host.page.getByTestId('contactPicker.joinUrl').inputValue();

    await guest.page.goto(joinUrl);
    await expect.poll(() => guest.workspaceId, { timeout: 60_000 }).toBe(spaceB);
  });
});
```

- [ ] **Step 2: Run** — follow `packages/e2e/composer-e2e` README / `moon.yml` for the e2e task, e.g. `moon run composer-e2e:e2e -- contacts.spec.ts --project=chromium`. Expected PASS. If the join-URL origin differs from the dev server origin, rewrite it with `new URL(new URL(joinUrl).search, guest.page.url())` before `goto`.
- [ ] **Step 3: Commit** — `git commit -m "composer-e2e: contacts end-to-end test"`.

---

### Task 9: Wrap-up

- [ ] **Step 1:** Add a changeset `.changeset/admit-contact-role.md` for `@dxos/client` (minor): "`space.admitContact(contact, role?)` accepts a role; the default is now Editor (was Admin)." Follow `agents/instructions/changesets.md`.
- [ ] **Step 2:** Add a `## Contacts` section to `packages/plugins/plugin-client/PLUGIN.mdl` and an AddMembers note to `packages/plugins/plugin-space/PLUGIN.mdl`, recording what was built.
- [ ] **Step 3:** `pnpm format`; `moon run :lint -- --fix` on touched packages; run every test file named in Tasks 1–5.
- [ ] **Step 4:** Commit, push, update PR #13361's description to cover implementation as well as the spec.
