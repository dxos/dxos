//
// Copyright 2024 DXOS.org
//

import { type Tool } from 'modelfusion';

import { describe, test } from '@dxos/test';

import { type Contact, createPlan, Directory, directory, execPlan, scheduler } from './tools';

// Restart ollama if times out (server can hang): `ollama serve`.
// TODO(burdon): Long running tasks: https://modelfusion.dev/guide/experimental/server
// TODO(burdon): Local voice transcription https://github.com/ggerganov/whisper.cpp

// TODO(burdon): RAG tool.
// TODO(burdon): Discord fetcher tool.
// TODO(burdon): Chess analysis tool.

const contacts: Contact[] = [
  {
    name: 'alice',
    team: 'engineer',
  },
  {
    name: 'bob',
    team: 'engineer',
  },
  {
    name: 'charlie',
    team: 'sales',
  },
  {
    name: 'david',
    team: 'sales',
  },
  {
    name: 'elena',
    team: 'research',
  },
];

// https://github.com/vercel/modelfusion/tree/main/examples/middle-school-math-agent
describe.only('agent', () => {
  test('simple loop', async () => {
    const dir = new Directory();
    await dir.upsert(contacts);

    const tools: Tool<any, any, any>[] = [directory(dir), scheduler()];

    const objective = 'schedule a meeting with the eng team for monday';
    const plan = await createPlan({ tools, objective });
    await execPlan({ tools, plan });
  }).timeout(30_000);
});
