//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'AssistantSkill': 'src/skills/assistant/AssistantSkill.ts',
    'index': 'src/index.ts',
    'AssistantPlugin': 'src/AssistantPlugin.ts',
    'skills': 'src/skills/index.ts',
    'capabilities': 'src/capabilities/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'execution-graph': 'src/execution-graph/index.ts',
    'extensions': 'src/extensions/index.ts',
    'hooks': 'src/hooks/index.ts',
    'meta': 'src/meta.ts',
    'operations': 'src/operations/index.ts',
    'plugin': 'src/plugin.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'AssistantEvents': 'src/types/AssistantEvents.ts',
    'AssistantOptions': 'src/types/AssistantOptions.ts',
    'AssistantPreset': 'src/types/AssistantPreset.ts',
    'AssistantService': 'src/types/AssistantService.ts',
    'ChatSurface': 'src/types/ChatSurface.ts',
    'Settings': 'src/types/Settings.ts',
    'Assistant': 'src/types/Assistant.ts',
    'AssistantOperation': 'src/types/AssistantOperation.ts',
    'AssistantCapabilities': 'src/types/AssistantCapabilities.ts',
    'Ollama': 'src/types/Ollama.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
