//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '@dxos/cli-util';

export type FormattedPlugin = {
  id: string;
  name: string;
  enabled: boolean;
  core: boolean;
};

/**
 * Pretty prints a plugin with ANSI colors.
 */
export const printPlugin = (plugin: FormattedPlugin) => {
  const status = plugin.core ? 'core' : plugin.enabled ? 'enabled' : 'disabled';
  return FormBuilder.make({ title: plugin.name }).pipe(
    FormBuilder.set('id', plugin.id),
    FormBuilder.set('status', status),
    FormBuilder.build,
  );
};

