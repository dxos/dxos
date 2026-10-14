//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Operation from '@dxos/compute/Operation';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role, useMembers, useSpaces } from '@dxos/react-client/echo';
import { useContacts, useIdentity } from '@dxos/react-client/halo';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { ContactPicker } from '@dxos/shell/react';

import { meta } from '#meta';

const ROLES = [SpaceMember_Role.READER, SpaceMember_Role.EDITOR, SpaceMember_Role.ADMIN] as const;

type AdmitRole = (typeof ROLES)[number];

const roleLabel: Record<AdmitRole, string> = {
  [SpaceMember_Role.EDITOR]: 'role-editor.label',
  [SpaceMember_Role.READER]: 'role-viewer.label',
  [SpaceMember_Role.ADMIN]: 'role-admin.label',
};

export type ContactPickerContainerProps = AppSurface.ContactPickerData;

type SourcedInvitee = AppCapabilities.Invitee & { source: AppCapabilities.InviteeSource };

/** Who the space's `InviteeSource`s offer beside contacts, listed again whenever `revision` changes. */
const useInvitees = (space: ContactPickerContainerProps['space'], revision: number): SourcedInvitee[] => {
  const manager = PluginManagerProvider.usePluginManager();
  const sources = Hooks.useCapabilities(AppCapabilities.InviteeSource);
  const [invitees, setInvitees] = useState<SourcedInvitee[]>([]);
  useEffect(() => {
    let cancelled = false;
    void EffectEx.runPromise(
      Effect.forEach(sources, (source) =>
        source.list(space).pipe(Effect.map((listed) => listed.map((invitee) => ({ ...invitee, source })))),
      ).pipe(Effect.provideService(Capability.Service, manager.capabilities)),
    ).then(
      (listed) => !cancelled && setInvitees(listed.flat()),
      (err) => log.catch(err),
    );
    return () => {
      cancelled = true;
    };
  }, [manager, sources, space, revision]);
  return invitees;
};

export const ContactPickerContainer = ({ space, onAdd }: ContactPickerContainerProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const contacts = useContacts();
  const members = useMembers(space.key);
  const spaces = useSpaces();
  const identity = useIdentity();
  const [selected, setSelected] = useState<string>();
  const [role, setRole] = useState<AdmitRole>(SpaceMember_Role.EDITOR);
  const [joinUrl, setJoinUrl] = useState<string>();
  const [pending, setPending] = useState(false);
  const manager = PluginManagerProvider.usePluginManager();
  const operationInvoker = Hooks.useOperationInvoker();
  // Bumped after an invitee is added, so the sources list who is left.
  const [added, setAdded] = useState(0);
  const invitees = useInvitees(space, added);
  const invitee = invitees.find(({ key }) => key === selected);

  const memberKeys = useMemo(
    () =>
      members
        .map((member) => toPublicKey(member.identity?.identityKey)?.toHex())
        .filter((key): key is string => key !== undefined),
    [members],
  );
  // An agent joins through its `InviteeSource`, so its identity, a contact to everyone in its own space, is not one here.
  const agentKeys = AppSpace.agentIdentityKeys(spaces).map((key) => key.toHex());
  const selfKey = toPublicKey(identity?.identityKey);
  const selfRole = members.find(
    (member) => selfKey && toPublicKey(member.identity?.identityKey)?.equals(selfKey),
  )?.role;
  const canAdmit = selfRole === SpaceMember_Role.OWNER || selfRole === SpaceMember_Role.ADMIN;

  const handleAdd = async () => {
    if (!selected) {
      return;
    }

    setPending(true);
    try {
      if (invitee) {
        await EffectEx.runPromise(
          invitee.source
            .add(space, invitee.key)
            .pipe(
              Effect.provideService(Capability.Service, manager.capabilities),
              Effect.provideService(Operation.Service, operationInvoker),
            ),
        );
        setSelected(undefined);
        setAdded((count) => count + 1);
        return;
      }
      const result = await onAdd([selected], role);
      setJoinUrl(result.joinUrl);
      setSelected(result.failed[0]?.key);
    } catch (err) {
      // Selection is kept so the user can retry.
      log.catch(err);
    } finally {
      setPending(false);
    }
  };

  if (contacts.length === 0 && invitees.length === 0) {
    return <p className='text-fg-muted'>{t('contact-picker-empty.message')}</p>;
  }

  return (
    <Layout.Container gap='md' role='group' gutter='none'>
      <Layout.Flex align='center' gap='sm'>
        <ContactPicker
          contacts={contacts}
          invitees={invitees}
          excludeKeys={[...memberKeys, ...agentKeys]}
          value={selected}
          onChange={(key) => {
            setSelected(key);
            setJoinUrl(undefined);
          }}
          disabled={!canAdmit}
        />
        <Select.Root
          value={[String(role)]}
          onValueChange={({ value: [value] }) =>
            setRole(ROLES.find((candidate) => String(candidate) === value) ?? SpaceMember_Role.EDITOR)
          }
          items={ROLES.map((value) => ({ value: String(value), label: t(roleLabel[value]) }))}
        >
          {/* A role is a member's; an invitee such as an agent joins without one. */}
          <Select.Trigger classNames='min-w-[6rem]' disabled={!canAdmit || invitee !== undefined} />
          <Select.Content>
            {ROLES.map((value) => (
              <Select.Item key={value} item={{ value: String(value), label: t(roleLabel[value]) }} />
            ))}
          </Select.Content>
        </Select.Root>
        <SystemButton.Add
          iconOnly
          label={t('contact-picker-add.label')}
          disabled={!canAdmit || pending || !selected}
          onClick={handleAdd}
          data-testid='contactPicker.add'
        />
      </Layout.Flex>
      {joinUrl && (
        <Layout.Flex gap='sm'>
          <Field.Root readOnly>
            <Input.Root readOnly value={joinUrl} data-testid='contactPicker.joinUrl' />
          </Field.Root>
          <SystemButton.Clipboard value={joinUrl} />
        </Layout.Flex>
      )}
    </Layout.Container>
  );
};

ContactPickerContainer.displayName = 'ContactPickerContainer';
