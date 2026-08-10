//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'AgentIdentity': 'src/AgentIdentity.ts',
    'AgentService': 'src/AgentService.ts',
    'Cancellation': 'src/Cancellation.ts',
    'Credential': 'src/Credential.ts',
    'Header': 'src/Header.ts',
    'LayerSpec': 'src/LayerSpec.ts',
    'McpServer': 'src/McpServer.ts',
    'Operation': 'src/Operation.ts',
    'OperationHandlerSet': 'src/OperationHandlerSet.ts',
    'OperationRegistry': 'src/OperationRegistry.ts',
    'Process': 'src/Process.ts',
    'Runnable': 'src/Runnable.ts',
    'ServiceResolver': 'src/ServiceResolver.ts',
    'StorageService': 'src/StorageService.ts',
    'Trace': 'src/Trace.ts',
    'types/Instructions': 'src/types/Instructions.ts',
    'types/Project': 'src/types/Project.ts',
    'types/Routine': 'src/types/Routine.ts',
    'types/Script': 'src/types/Script.ts',
    'types/Skill': 'src/types/Skill.ts',
    'types/Template': 'src/types/Template.ts',
    'types/Trigger': 'src/types/Trigger.ts',
    'types/TriggerEvent': 'src/types/TriggerEvent.ts',
    'errors': 'src/errors.ts',

    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
