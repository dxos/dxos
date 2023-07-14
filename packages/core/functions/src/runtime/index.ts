//
// Copyright 2023 DXOS.org
//

import express from 'express';
import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { getPortPromise } from 'portfinder';

import { Client } from '@dxos/client';
import { log } from '@dxos/log';

import { FunctionContext, FunctionHandler, Reply } from '../interface';
import { FunctionsManifest } from '../defintions';

export type FunctionsRuntimeParams = {
  client: Client;
  functionsDirectory: string;
  manifest: FunctionsManifest
};

export const runFunctions = async (options: FunctionsRuntimeParams) => {
  const functionHandlers: Record<string, FunctionHandler> = {};

  for (const [functionName, _] of Object.entries(options.manifest.functions)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const module = require(join(options.functionsDirectory, functionName));
      const handler = module.default;
      if (typeof handler !== 'function') {
        throw new Error(`Function ${functionName} does not export a default function`);
      }

      functionHandlers[functionName] = handler;
    } catch (e) {
      console.error(e);
    }
  }

  const port = await getPortPromise({ startPort: 7000 });

  const app = express();
  app.use(express.json());

  app.post('/:functionName', async (req, res) => {
    const functionName = req.params.functionName;

    const replyBuilder: Reply = {
      status: (code: number) => {
        res.statusCode = code;
        return replyBuilder;
      },
      succeed: (result: any) => {
        res.end(JSON.stringify(result));
        return replyBuilder;
      },
    };
    const context: FunctionContext = {
      client: options.client,
      status: replyBuilder.status.bind(replyBuilder),
    };

    void (async () => {
      try {
        await functionHandlers[functionName](req.body, context);
      } catch (err: any) {
        res.statusCode = 500;
        res.end(err.message);
      }
    })();
  });
  app.listen(port);

  const functionNames = Object.keys(functionHandlers);
  const { registrationId } = await options.client.services.services.FunctionRegistryService!.register({
    endpoint: `http://localhost:${port}`,
    functions: functionNames.map((name) => ({ name })),
  });

  process.on('SIGINT', async () => {
    await options.client.services.services.FunctionRegistryService!.unregister({ registrationId });
    process.exit();
  });

  log.info('functions runtime started', { port, functionNames, registrationId });
};
