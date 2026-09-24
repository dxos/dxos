//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import { toPublicKey } from '@dxos/protocols/buf';
import { SpaceMember_Role, useMembers } from '@dxos/react-client/echo';
import { useContacts, useIdentity } from '@dxos/react-client/halo';
import { Field, Select, SystemIconButton, useTranslation } from '@dxos/react-ui';
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
    return <p className='text-description'>{t('contact-picker-empty.message')}</p>;
  }

  return (
    <div role='group' className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
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
          value={String(role)}
          onValueChange={(value) =>
            setRole(ROLES.find((candidate) => String(candidate) === value) ?? SpaceMember_Role.EDITOR)
          }
        >
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
        <SystemIconButton.Add
          iconOnly
          label={t('contact-picker-add.label')}
          disabled={!canAdmit || pending || !selected}
          onClick={handleAdd}
          data-testid='contactPicker.add'
        />
      </div>
      {joinUrl && (
        <div className='flex gap-2'>
          <Field.Root readOnly>
            <Field.Input readOnly value={joinUrl} data-testid='contactPicker.joinUrl' />
          </Field.Root>
          <SystemIconButton.Clipboard value={joinUrl} />
        </div>
      )}
    </div>
  );
};

ContactPickerContainer.displayName = 'ContactPickerContainer';
