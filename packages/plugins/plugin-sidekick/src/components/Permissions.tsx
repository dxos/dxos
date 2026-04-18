//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type PermissionEntry = {
  profileId: string;
  name: string;
  autoRespond: boolean;
  createDraft: boolean;
  researchEnabled: boolean;
};

export type PermissionsProps = {
  entries: PermissionEntry[];
  onUpdate?: (profileId: string, field: 'autoRespond' | 'createDraft' | 'researchEnabled', value: boolean) => void;
};

export const Permissions = ({ entries, onUpdate }: PermissionsProps) => {
  const { t } = useTranslation(meta.id);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Form.Section label={t('permissions.title')}>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-description'>
            <th className='pb-1 font-normal'>{t('contact.label')}</th>
            <th className='pb-1 font-normal text-center'>{t('auto-respond.label')}</th>
            <th className='pb-1 font-normal text-center'>{t('create-draft.label')}</th>
            <th className='pb-1 font-normal text-center'>{t('research.label')}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.profileId} className='border-t border-separator'>
              <td className='py-1'>{entry.name}</td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.autoRespond}
                  onChange={() => onUpdate?.(entry.profileId, 'autoRespond', !entry.autoRespond)}
                  aria-label={`Auto-respond for ${entry.name}`}
                />
              </td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.createDraft}
                  onChange={() => onUpdate?.(entry.profileId, 'createDraft', !entry.createDraft)}
                  aria-label={`Draft for ${entry.name}`}
                />
              </td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.researchEnabled}
                  onChange={() => onUpdate?.(entry.profileId, 'researchEnabled', !entry.researchEnabled)}
                  aria-label={`Research for ${entry.name}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Form.Section>
  );
};
