//
// Copyright 2023 DXOS.org
//

import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { log } from '@dxos/log';
import {
  type FunctionRegistryService,
  type RegisterRequest,
  type RegisterResponse,
  type UnregisterRequest,
} from '@dxos/protocols/proto/dxos/agent/functions';

import { type FunctionDispatcher, type FunctionInvocation, type FunctionInvocationResult } from './types';

type Registration = {
  id: string;
  request: RegisterRequest;
};

export class DevFunctionDispatcher implements FunctionDispatcher, FunctionRegistryService {
  private _registrations: Registration[] = [];

  constructor(private readonly _options: { endpoint: string }) {}

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const registrationId = randomUUID();
    this._registrations.push({
      id: registrationId,
      request,
    });

    log.info('registered', { registrationId });
    return { registrationId, endpoint: this._options.endpoint };
  }

  async unregister({ registrationId }: UnregisterRequest): Promise<void> {
    const index = this._registrations.findIndex((registration) => registration.id === registrationId);
    if (index >= 0) {
      this._registrations.splice(index, 1);
    }

    log.info('unregistered', { registrationId });
  }

  async invoke(invocation: FunctionInvocation): Promise<FunctionInvocationResult> {
    const registration = this._registrations.findLast((registration) =>
      registration.request.functions?.some(({ path }) => '/' + invocation.path === path),
    );
    if (!registration) {
      throw new Error(`Function not found: ${invocation.path} `);
    }

    const url = path.join(registration.request.endpoint, invocation.path);
    const result = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(invocation.event),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      status: result.status,
      response: await result.text(),
    };
  }
}
