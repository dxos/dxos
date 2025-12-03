import { Headers, Miniflare, Request, type RequestInfo } from 'miniflare';
import { Resource, type Context } from '@dxos/context';
import { SerializedError, type EdgeEnvelope } from '@dxos/protocols';

export type InvokeResult =
  | {
      _kind: 'success';
      /**
       * The output of the function.
       */
      result: unknown;
    }
  | {
      _kind: 'error';
      error: SerializedError;
    };

export type FunctionWorkerOptions = {
  mainModule: string;
  modules: {
    [filename: string]: {
      contents: Uint8Array<ArrayBuffer>;
      contentType: string;
    };
  };
};

export const makeJsModule = (source: string) => ({
  contentType: 'application/javascript',
  contents: new TextEncoder().encode(source),
});

export class FunctionWorker extends Resource {
  #miniflare: Miniflare;

  constructor(opts: FunctionWorkerOptions) {
    super();
    if (!opts.modules[opts.mainModule]) {
      throw new Error(`Main module not found: ${opts.mainModule}`);
    }

    const modules: MiniflareModule[] = Object.entries(opts.modules).map(([filename, mod]) => {
      switch (mod.contentType) {
        case 'application/javascript':
          return {
            type: 'ESModule' as const,
            path: filename,
            contents: mod.contents,
          };
        default:
          throw new Error(`Unsupported content type: ${mod.contentType}`);
      }
    });

    modules.sort((a, b) => (a.path === opts.mainModule ? -1 : 1));

    this.#miniflare = new Miniflare({
      modules,
    });
  }

  protected override async _close(_ctx: Context): Promise<void> {
    await this.#miniflare.dispose();
  }

  async invoke(input: unknown): Promise<InvokeResult> {
    const request = new Request('http://functions.dxos.internal/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Edge-Env': 'test',
      },
      body: JSON.stringify(input),
    });
    const response = await this.#miniflare.dispatchFetch(request);
    try {
      const envelope = (await response.clone().json()) as EdgeEnvelope<unknown>;
      if (envelope.success) {
        return { _kind: 'success', result: envelope.data };
      }
      return {
        _kind: 'error',
        error: envelope.error ?? {
          message: envelope.message,
        },
      };
    } catch (err) {
      return {
        _kind: 'error',
        error: {
          message: (await response.text()).slice(0, 1024),
        },
      };
    }
  }
}

type MiniflareModule = {
  type: 'ESModule' | 'CommonJS' | 'Text' | 'Data' | 'CompiledWasm' | 'PythonModule' | 'PythonRequirement';
  path: string;
  contents?: string | Uint8Array<ArrayBuffer> | undefined;
};
