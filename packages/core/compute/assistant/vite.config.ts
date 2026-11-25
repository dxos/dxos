//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'extraction': 'src/extraction/index.ts',
    'ExecutionGraph': 'src/util/execution-graph.ts',
    'describe/Describe': 'src/describe/Describe.ts',
    'session/AiContext': 'src/session/AiContext.ts',
    'types/AgentSetup': 'src/types/AgentSetup.ts',
    'request/AiRequest': 'src/request/AiRequest.ts',
    'session/AiSession': 'src/session/AiSession.ts',
    'session/Legacy': 'src/session/Legacy.ts',
    'session/TrajectoryCache': 'src/session/TrajectoryCache.ts',
    'session/TrajectoryStore': 'src/session/TrajectoryStore.ts',
    'session/Alarm': 'src/session/Alarm.ts',
    'session/SessionLink': 'src/session/SessionLink.ts',
  },
  test: { node: true },
});
