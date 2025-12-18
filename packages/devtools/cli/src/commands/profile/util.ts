//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '../../util';

export type ProfileInfo = {
  name: string;
  isCurrent: boolean;
  fullPath: string;
  storagePath: string;
  edge?: string;
};

/**
 * Pretty prints profile creation result with ANSI colors.
 */
export const printProfileCreated = (name: string, path: string) =>
  FormBuilder.of({ title: 'Profile created' })
    .set({ key: 'name', value: name })
    .set({ key: 'path', value: path })
    .build();

/**
 * Pretty prints profile deletion result with ANSI colors.
 */
export const printProfileDeleted = (name: string) =>
  FormBuilder.of({ title: 'Profile deleted' }).set({ key: 'name', value: name }).build();

/**
 * Pretty prints profile reset result with ANSI colors.
 */
export const printProfileReset = (profile: string) =>
  FormBuilder.of({ title: 'Profile reset' }).set({ key: 'profile', value: profile }).build();

/**
 * Pretty prints a profile with ANSI colors.
 */
export const printProfile = (profile: ProfileInfo) => {
  const title = profile.isCurrent ? `${profile.name} (current)` : profile.name;
  return FormBuilder.of({ title })
    .set({ key: 'fullPath', value: profile.fullPath })
    .set({ key: 'storagePath', value: profile.storagePath })
    .set({ key: 'edge', value: profile.edge ?? '<none>' })
    .build();
};
