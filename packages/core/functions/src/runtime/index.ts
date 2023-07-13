import { Client } from "@dxos/client";
import { readdir } from 'node:fs/promises'
import { FunctionContext, FunctionHandler, Reply } from "../interface";
import { extname } from "node:path";
import { join } from "node:path";
import { getPortPromise } from 'portfinder'
import { createServer } from "node:http";
import { log } from '@dxos/log';
import express from 'express';

const FUNCTION_EXTENSIONS = ['.js', '.ts'];

export type FunctionsRuntimeParams = {
  client: Client;
  functionsDirectory: string;
}

export async function runFunctions(options: FunctionsRuntimeParams) {
  const files = await readdir(options.functionsDirectory);

  const functionHandlers: Record<string, FunctionHandler> = {};

  for (const file of files) {
    if (!FUNCTION_EXTENSIONS.some(ext => extname(file) === ext)) {
      continue;
    }

    try {
      const module = require(join(options.functionsDirectory, file));
      const handler = module.default;
      if (typeof handler !== 'function') {
        throw new Error(`Function ${file} does not export a default function`);
      }

      const functionName = file.slice(0, -extname(file).length);

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
      }
    }
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
    })()
  });
  app.listen(port);
  
  const functionNames = Object.keys(functionHandlers);
  const { registrationId } = await options.client.services.services.FunctionRegistryService!.register({
    endpoint: `http://localhost:${port}`,
    functions: functionNames.map(name => ({ name }))
  })

  process.on('SIGINT', async () => {
    await options.client.services.services.FunctionRegistryService!.unregister({ registrationId });
    process.exit();
  })

  log.info('functions runtime started', { port, functionNames, registrationId });
}