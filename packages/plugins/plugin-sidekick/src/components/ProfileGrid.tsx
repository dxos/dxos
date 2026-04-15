//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type ProfileCardData = {
  id: string;
  name: string;
  tag?: string;
  updatedCount?: number;
};

export type ProfileGridProps = {
  profiles: ProfileCardData[];
  onSelect?: (profileId: string) => void;
  classNames?: string;
};

export const ProfileGrid = ({ profiles, onSelect, classNames }: ProfileGridProps) => {
  if (profiles.length === 0) {
    return (
      <div className={classNames}>
        <p className='text-sm text-description italic'>No profiles yet.</p>
      </div>
    );
  }

  return (
    <div className={classNames}>
      <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelect?.(profile.id)}
            className='p-3 rounded-md border border-separator text-left hover:bg-hoverSurface transition-colors'
          >
            <p className='text-sm font-medium truncate'>{profile.name}</p>
            {profile.tag && <p className='text-xs text-description'>{profile.tag}</p>}
            {(profile.updatedCount ?? 0) > 0 && (
              <p className='text-xs text-accentText mt-1'>★ {profile.updatedCount} new</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
