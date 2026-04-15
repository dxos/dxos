//
// Copyright 2025 DXOS.org
//

import React from 'react';

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
  classNames?: string;
};

export const Permissions = ({ entries, onUpdate, classNames }: PermissionsProps) => {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={classNames}>
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-description'>
            <th className='pb-1 font-normal'>Contact</th>
            <th className='pb-1 font-normal text-center'>Auto-respond</th>
            <th className='pb-1 font-normal text-center'>Draft</th>
            <th className='pb-1 font-normal text-center'>Research</th>
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
                />
              </td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.createDraft}
                  onChange={() => onUpdate?.(entry.profileId, 'createDraft', !entry.createDraft)}
                />
              </td>
              <td className='py-1 text-center'>
                <input
                  type='checkbox'
                  checked={entry.researchEnabled}
                  onChange={() => onUpdate?.(entry.profileId, 'researchEnabled', !entry.researchEnabled)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
