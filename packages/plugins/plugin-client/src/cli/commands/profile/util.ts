//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';

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
  FormBuilder.make({ title: 'Profile created' }).pipe(
    FormBuilder.set('name', name),
    FormBuilder.set('path', path),
    FormBuilder.build,
  );

/**
 * Pretty prints profile deletion result with ANSI colors.
 */
export const printProfileDeleted = (name: string) =>
  FormBuilder.make({ title: 'Profile deleted' }).pipe(FormBuilder.set('name', name), FormBuilder.build);

/**
 * Pretty prints profile reset result with ANSI colors.
 */
export const printProfileReset = (profile: string) =>
  FormBuilder.make({ title: 'Profile reset' }).pipe(FormBuilder.set('profile', profile), FormBuilder.build);

/**
 * Pretty prints a profile with ANSI colors.
 */
export const printProfile = (profile: ProfileInfo) => {
  const title = profile.isCurrent ? `${profile.name} (current)` : profile.name;
  return FormBuilder.make({ title }).pipe(
    FormBuilder.set('fullPath', profile.fullPath),
    FormBuilder.set('storagePath', profile.storagePath),
    FormBuilder.set('edge', profile.edge ?? '<none>'),
    FormBuilder.build,
  );
};
