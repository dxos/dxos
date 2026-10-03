//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role, useMembers } from '@dxos/react-client/echo';
import { useContacts, useIdentity } from '@dxos/react-client/halo';
import { Container, Field, Flex, Input, Select, SystemButton, useTranslation } from '@dxos/react-ui';
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

export const ContactPickerContainer = ({ space, onAdd }: ContactPickerContainerProps) => {
  const { t } = useTranslation(meta.profile.key);
  const contacts = useContacts();
  const members = useMembers(space.key);
  const identity = useIdentity();
  const [selected, setSelected] = useState<string>();
  const [role, setRole] = useState<AdmitRole>(SpaceMember_Role.EDITOR);
  const [joinUrl, setJoinUrl] = useState<string>();
  const [pending, setPending] = useState(false);

  const memberKeys = useMemo(
    () =>
      members
        .map((member) => toPublicKey(member.identity?.identityKey)?.toHex())
        .filter((key): key is string => key !== undefined),
    [members],
  );
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

  if (contacts.length === 0) {
    return <p className='text-fg-muted'>{t('contact-picker-empty.message')}</p>;
  }

  return (
    <Container gap='md' role='group' gutter='none'>
      <Flex align='center' gap='sm'>
        <ContactPicker
          contacts={contacts}
          excludeKeys={memberKeys}
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
          <Select.Trigger classNames='min-w-[6rem]' disabled={!canAdmit} />
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
      </Flex>
      {joinUrl && (
        <Flex gap='sm'>
          <Field.Root readOnly>
            <Input readOnly value={joinUrl} data-testid='contactPicker.joinUrl' />
          </Field.Root>
          <SystemButton.Clipboard value={joinUrl} />
        </Flex>
      )}
    </Container>
  );
};

ContactPickerContainer.displayName = 'ContactPickerContainer';
