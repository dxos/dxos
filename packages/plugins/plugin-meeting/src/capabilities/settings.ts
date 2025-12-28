//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { meta } from '../meta';
import { Meeting } from '../types';

export default Capability.makeModule(() => {
  const settings = live<Meeting.Settings>({
    entityExtraction: true,
  });

  return Capability.contributes(Capabilities.Settings, {
    prefix: meta.id,
    schema: Meeting.Settings,
    value: settings,
  });
});
