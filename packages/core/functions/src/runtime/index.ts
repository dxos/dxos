import { Client } from "@dxos/client";
import { readdir } from 'node:fs/promises'
import { FunctionHandler } from "../interface";
import { extname } from "node:path";
import { join } from "node:path";
import {getPortPromise} from 'portfinder'
import { createServer } from "node:http";
import { log } from '@dxos/log';

const FUNCTION_EXTENSIONS = ['.js', '.ts'];

export type FunctionsRuntimeParams = {
  client: Client;
  functionsDirectory: string;
}

export async function runFunctions(options: FunctionsRuntimeParams) {
  const files = await readdir(options.functionsDirectory);
  
  const functionHandlers: Record<string, FunctionHandler> = {};

  for (const file of files) {
    if(!FUNCTION_EXTENSIONS.includes(file)) {
      continue;
    }

    try {
      const module = await import(join(options.functionsDirectory, file));
      const handler = module.default;
      if(typeof handler !== 'function') {
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
    console.log(req.url);
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