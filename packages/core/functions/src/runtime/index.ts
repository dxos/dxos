import { Client } from "@dxos/client";
import { readdir } from 'node:fs/promises'
import { FunctionContext, FunctionHandler, Reply } from "../interface";
import { extname } from "node:path";
import { join } from "node:path";
import { getPortPromise } from 'portfinder'
import { createServer } from "node:http";
import { log } from '@dxos/log';
import { error } from "node:console";

const FUNCTION_EXTENSIONS = ['.js', '.ts'];

export type FunctionsRuntimeParams = {
  client: Client;
  functionsDirectory: string;
}

export async function runFunctions(options: FunctionsRuntimeParams) {
  const files = await readdir(options.functionsDirectory);

  const functionHandlers: Record<string, FunctionHandler> = {};

  log.info('functions directory', { dir: options.functionsDirectory, files });

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
  const server = createServer((req, res) => {
    const functionName = req.url?.slice(1);
    if (!functionName || !functionHandlers[functionName]) {
      res.statusCode = 404;
      res.end();
      return;
    }

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
        await functionHandlers[functionName]({}, context);
      } catch (err: any) {
        res.statusCode = 500;
        res.end(err.message);
      }
    })()
  });
  
  server.listen(port);
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