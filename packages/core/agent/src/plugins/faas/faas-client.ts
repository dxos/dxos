//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Runtime } from '@dxos/protocols/proto/dxos/config';

import { FunctionListEntry } from './api';

// TODO(burdon): Protobuf.
export type Trigger = {
  id: string;

  function: {
    /**
     * Name of deployed function to invoke.
     */
    name: string;
  };

  // TODO(burdon): Factor out since not all events are triggered by subscriptions.
  spaceKey?: string;
  // TODO(burdon): ECHO Query protobuf.
  subscription?: {
    /**
     * Object types.
     */
    type?: string;

    /**
     * Properties to match.
     */
    props?: Record<string, any>;

    /**
     * List of paths for referenced objects to include.
     */
    nested?: string[];
  };
};

export type TriggerEvent = {
  trigger: Trigger;
  // TODO(burdon): Rename objectIds.
  objects?: string[];
};

export type InvocationContext = {
  // TODO(burdon): Multiple clientEndpoints (socket, http, etc.)
  clientUrl?: string;
};

export type InvocationData = {
  event: TriggerEvent;
  context: InvocationContext;
};

/**
 * Wrapper for the OpenFaaS HTTP API.
 */
export class FaasClient {
  constructor(
    private readonly _config: Runtime.Services.Faasd,
    private readonly _context: InvocationContext = {},
  ) {
    invariant(this._config.gateway, 'Invalid gateway URL.');
  }

  async dispatch(event: TriggerEvent) {
    const functions = await this.listFunctions();
    const fn = functions.find((fn) => fn.name === event.trigger.function.name);
    if (!fn) {
      log.warn('function not found', { function: event.trigger.function.name });
      return; // TODO(burdon): Throw.
    }

    const data: InvocationData = {
      event,
      context: this._context,
    };

    log.info('exec', { id: event.trigger.id, function: fn.name });
    const result = await this._execFunction(fn.name, data);
    log.info('result', { id: event.trigger.id, result });
  }

  async listFunctions(): Promise<FunctionListEntry[]> {
    const res = await fetch(`${this._config.gateway}/system/functions`, {
      headers: this._createHeaders(),
    });

    const { status } = res;
    if (status !== 200) {
      throw new Error(`Invalid status: ${status}`);
    }

    return await res.json();
  }

  private async _execFunction(name: string, data: InvocationData) {
    const res = await fetch(`${this._config.gateway}/function/${name}`, {
      method: 'POST',
      headers: this._createHeaders(),
      body: JSON.stringify(data),
    });

    const body = await res.text();
    return { status: res.status, body };
  }

  private _createHeaders() {
    return {
      Authorization: `Basic ${Buffer.from(`${this._config.username}:${this._config.password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }
}
