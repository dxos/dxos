//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { PresenterCapabilities } from './capabilities';

export default () => {
  // TODO(burdon): Do we need context providers if we can get the state from the plugin?
  //  No, the main reason would be compability with existing apis.
  //  For anything made specifically for the plugin framework they can depend on `useCapabilities`.
  const state = create<PresenterCapabilities.State>({ presenting: false });

  return contributes(PresenterCapabilities.State, state);
};
