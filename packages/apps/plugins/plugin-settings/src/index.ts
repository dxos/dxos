//
// Copyright 2023 DXOS.org
//

import { SettingsPlugin } from './SettingsPlugin';

export default SettingsPlugin;

export * from './SettingsPlugin';

// TODO(wittjosiah): Remove.
//  Settings should be exposed from plugins as state and intents rather than components.
export * from './components';
