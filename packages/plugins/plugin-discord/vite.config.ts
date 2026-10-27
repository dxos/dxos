//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/DiscordSource': 'src/DiscordSource.ts',
    'index': 'src/index.ts',
    'DiscordPlugin': 'src/DiscordPlugin.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'translations': 'src/translations.ts',
    'DiscordTargetOptions': 'src/types/DiscordTargetOptions.ts',
    'DiscordAdminOperation': 'src/types/DiscordAdminOperation.ts',
    'DiscordAgentOperation': 'src/types/DiscordAgentOperation.ts',
    'DiscordBot': 'src/types/DiscordBot.ts',
    'DiscordChannel': 'src/types/DiscordChannel.ts',
    'DiscordEvents': 'src/types/DiscordEvents.ts',
    'DiscordOperation': 'src/types/DiscordOperation.ts',
    'ShowAndTell': 'src/types/ShowAndTell.ts',
    'ShowAndTellOperation': 'src/types/ShowAndTellOperation.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
