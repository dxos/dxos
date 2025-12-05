//
// Copyright 2025 DXOS.org
//

import http from 'node:http';

import { safeParseJson } from '@dxos/util';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost';
const OLLAMA_PORT = parseInt(process.env.OLLAMA_PORT || '11434', 10);
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:latest';

export type OllamaStreamCallback = (chunk: string) => void;

export type OllamaOptions = {
  model?: string;
  host?: string;
  port?: number;
};

/**
 * Stream a prompt to Ollama and receive streamed responses.
 * Based on the implementation in packages/experimental/logic/src/cli.ts
 */
export const streamOllamaResponse = async (
  prompt: string,
  onChunk: OllamaStreamCallback,
  options: OllamaOptions = {},
): Promise<void> => {
  const model = options.model || DEFAULT_MODEL;
  const host = options.host || OLLAMA_HOST;
  const port = options.port || OLLAMA_PORT;

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

    const requestOptions = {
      hostname: host,
      port,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(requestOptions, (res) => {
      if (res.statusCode !== 200) {
        // Read the error body for more details.
        let errorBody = '';
        res.on('data', (chunk: Buffer) => {
          errorBody += chunk.toString();
        });
        const { error } = safeParseJson<any>(errorBody, {});
        res.on('end', () => {
          reject(new Error(`Ollama API error: [${res.statusCode} ${res.statusMessage}] ${error}`));
        });
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
                onChunk(json.message.content);
              }
            } catch {
              // Ignore parse errors for partial JSON
            }
          }
        }
      });

      res.on('end', () => {
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

/**
 * Check if Ollama server is available.
 */
export const checkOllamaServer = async (host: string = OLLAMA_HOST, port: number = OLLAMA_PORT): Promise<boolean> => {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: '/api/tags',
        method: 'GET',
        timeout: 2000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      },
    );

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};
