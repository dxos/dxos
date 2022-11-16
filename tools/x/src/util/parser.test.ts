//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { LogParser, LogPrinter, LogReport } from './parser';

const log = `
Typescript
OK in 2316 ms

> nx run signal:build

Compiling TypeScript files for project "signal"...
Done compiling TypeScript files for project "signal".

> nx run react-appkit:build

Compiling TypeScript files for project "react-appkit"...
packages/apps/patterns/react-appkit/src/hooks/useTelemetry.ts:8:32 - error TS2307: Cannot find module '@dxos/react-async' or its corresponding type declarations.

8 import { useAsyncEffect } from '@dxos/react-async';
                                 ~~~~~~~~~~~~~~~~~~~
packages/apps/patterns/react-appkit/src/hooks/useSafeSpaceKey.ts:13:90 - error TS2307: Cannot find module './base-properties' or its corresponding type declarations.

13 import { DX_ENVIRONMENT, DX_RELEASE, BASE_PROPERTIES, getIdentifier, DX_TELEMETRY } from './base-properties';

> nx run mesh-protocol:build

Compiling TypeScript files for project "mesh-protocol"...
Done compiling TypeScript files for project "mesh-protocol".

> nx run echo-db:test --coverage=true --xmlReport=true

Executing mocha...
Running setup script.
Setup script finished in 70 ms.

  API
    ✓ Pseudo-code

  Schema
    ✓ class creation
    ✓ add and delete field
    ✓ edit field
    ✓ validate data item
    
 64 passing (7680ms)
 1 failing

  1) space/space-protocol
     replicates a feed through a webrtc connection:
   expect(received).toEqual(expected) // deep equality

Expected: 1
Received: 0

Failed with exit code 1 in chromium

> nx run client-testing:test --coverage=true --xmlReport=true

 >  NX   Running target "test" failed

   Failed tasks:
   
   - echo-db:test

   See Nx Cloud run details at https://cloud.nx.app/runs/1GzOpBzOXd
`;

// TODO(burdon): Test parser with test errors (not just build).

describe('Log parser', function () {
  it.only('parses log', async function () {
    const parser = new LogParser();
    const sections = parser.parse(log);
    expect(sections).to.have.length(5);

    const report: LogReport = {
      jobUrl: 'https://circleci.com/api/v1.1/project/gh/dxos/dxos/3378',
      sections
    };

    const printer = new LogPrinter(console.log, process.cwd());
    printer.logReport(report);
  });
});
