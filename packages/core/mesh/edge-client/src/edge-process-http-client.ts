//
// Copyright 2026 DXOS.org
//

import { type Context } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';
import { type ProcessProtocol } from '@dxos/protocols';

import { EdgeHttpClient } from './edge-http-client';

/**
 * Process-control routes, as a subclass rather than methods on {@link EdgeHttpClient}.
 *
 * Composer instantiates `EdgeHttpClient` during boot, so every method on it ships in the eager boot
 * graph whether or not the app calls it — and that graph is budgeted
 * (`composer-app:check-boot-budget`). Process control is only reached from the EDGE process manager,
 * so it lives here, off the package barrel behind the `@dxos/edge-client/process` subpath, and costs
 * boot nothing.
 */
export class EdgeProcessHttpClient extends EdgeHttpClient {
  /**
   * Spawns one of the EDGE host's built-in processes in `spaceId`. A process definition cannot cross
   * the wire, so the request names the process by its `Process.key`.
   */
  public async spawnProcess(
    ctx: Context,
    spaceId: SpaceId,
    body: ProcessProtocol.SpawnProcessRequest,
  ): Promise<ProcessProtocol.SpawnProcessResponse> {
    return this._call<ProcessProtocol.SpawnProcessResponse>(
      ctx,
      new URL(`/compute/processes/${spaceId}`, this.baseUrl),
      {
        body,
        method: 'POST',
        auth: true,
      },
    );
  }

  public async listProcesses(
    ctx: Context,
    spaceId: SpaceId,
    query?: ProcessProtocol.ListProcessesQuery,
  ): Promise<ProcessProtocol.ListProcessesResponse> {
    const url = new URL(`/compute/processes/${spaceId}`, this.baseUrl);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
    return this._call<ProcessProtocol.ListProcessesResponse>(ctx, url, {
      method: 'GET',
      auth: true,
    });
  }

  public async getProcess(ctx: Context, spaceId: SpaceId, pid: string): Promise<ProcessProtocol.ProcessInfo> {
    return this._call<ProcessProtocol.ProcessInfo>(
      ctx,
      new URL(`/compute/processes/${spaceId}/${encodeURIComponent(pid)}`, this.baseUrl),
      {
        method: 'GET',
        auth: true,
      },
    );
  }

  /** Terminates the process and clears its durable storage on the host. */
  public async terminateProcess(ctx: Context, spaceId: SpaceId, pid: string): Promise<void> {
    await this._call(ctx, new URL(`/compute/processes/${spaceId}/${encodeURIComponent(pid)}`, this.baseUrl), {
      method: 'DELETE',
      auth: true,
    });
  }

  /** Submits an input already encoded via the process definition's input schema. */
  public async submitProcessInput(
    ctx: Context,
    spaceId: SpaceId,
    pid: string,
    body: ProcessProtocol.SubmitInputRequest,
  ): Promise<void> {
    await this._call(ctx, new URL(`/compute/processes/${spaceId}/${encodeURIComponent(pid)}/input`, this.baseUrl), {
      body,
      method: 'POST',
      auth: true,
    });
  }

  /**
   * URL of the process's RPC endpoint. The surface is served as effect-rpc-over-HTTP, so callers
   * drive it with an `RpcClient` over this URL rather than through this client's JSON envelope;
   * {@link getAuthHeader} supplies the credential for those requests.
   */
  public processRpcUrl(spaceId: SpaceId, pid: string): URL {
    return new URL(`/compute/processes/${spaceId}/${encodeURIComponent(pid)}/rpc`, this.baseUrl);
  }

  /**
   * Reads the process's outputs and ephemeral trace at or after `cursor`, plus its state at read
   * time. Cursor-based so a client that reloads resumes an in-flight remote process where it left off.
   */
  public async readProcessEvents(
    ctx: Context,
    spaceId: SpaceId,
    pid: string,
    cursor: number,
  ): Promise<ProcessProtocol.ProcessEventsResponse> {
    const url = new URL(`/compute/processes/${spaceId}/${encodeURIComponent(pid)}/events`, this.baseUrl);
    url.searchParams.set('cursor', String(cursor));
    return this._call<ProcessProtocol.ProcessEventsResponse>(ctx, url, {
      method: 'GET',
      auth: true,
    });
  }
}
