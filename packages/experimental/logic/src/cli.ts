//
// Copyright 2025 DXOS.org
//

import http from 'node:http';
import readline from 'node:readline/promises';

import yargs, { type Argv } from 'yargs';
import { hideBin } from 'yargs/helpers';

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const DEFAULT_MODEL = 'llama3.2:latest';

const streamOllamaResponse = async (prompt: string, model: string) => {
  return new Promise<void>((resolve, reject) => {
    const postData = JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      stream: true,
    });

    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Ollama API error: ${res.statusCode} ${res.statusMessage}`));
        return;
      }

      let buffer = '';

      res.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.message?.content) {
                process.stdout.write(json.message.content);
              }
            } catch {}
          }
        }
      });

      res.on('end', () => {
        process.stdout.write('\n');
        resolve();
      });

      res.on('error', (error) => {
        reject(error);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
};

const startRepl = async (model: string) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`Ollama REPL (model: ${model})`);
  console.log('Enter your prompt (multi-line supported). Press Enter twice to submit.');
  console.log('Type "exit" and press Enter twice to quit.\n');

  while (true) {
    try {
      const lines: string[] = [];
      let firstLine = true;

      // Collect multi-line input until empty line.
      // Note: This implementation follows the OpenCode CLI pattern for multi-line input.
      while (true) {
        const line = await rl.question(firstLine ? '> ' : '  ');
        firstLine = false;

        // Empty line signals end of input.
        if (line === '') {
          break;
        }

        lines.push(line);
      }

      const prompt = lines.join('\n').trim();

      if (!prompt) {
        continue;
      }

      if (prompt.toLowerCase() === 'exit') {
        break;
      }

      await streamOllamaResponse(prompt, model);
      console.log(); // Extra newline after response.
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ERR_USE_AFTER_CLOSE') {
        break;
      }
      console.error('Error:', error instanceof Error ? error.message : error);
    }
  }

  rl.close();
};

const main = async () => {
  const argv = await yargs(hideBin(process.argv))
    .command('$0', 'Start Ollama REPL or send a single prompt', (yargs: Argv) => {
      return yargs
        .option('prompt', {
          alias: 'p',
          describe: 'Send a single prompt and exit',
          type: 'string',
        })
        .option('model', {
          alias: 'm',
          describe: 'The Ollama model to use',
          type: 'string',
          default: DEFAULT_MODEL,
        });
    })
    .help()
    .strict()
    .version(false)
    .parse();

  const prompt = argv.prompt as string | undefined;
  const model = argv.model as string;

  try {
    if (prompt) {
      // Single prompt mode.
      await streamOllamaResponse(prompt, model);
    } else {
      // REPL mode.
      await startRepl(model);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

void main();
