//
// Copyright 2023 DXOS.org
//

import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type FunctionRegistryService,
  type RegisterRequest,
  type RegisterResponse,
  type UnregisterRequest,
  type UpdateRegistrationRequest,
  type Function,
} from '@dxos/protocols/proto/dxos/agent/functions';

import { type FunctionDispatcher, type FunctionInvocation, type FunctionInvocationResult } from './types';

type Registration = {
  id: string;
  endpoint: string;
  functions: Function[];
};

export class DevFunctionDispatcher implements FunctionDispatcher, FunctionRegistryService {
  private readonly _registrations = new Map<string, Registration>();

  constructor(private readonly _options: { endpoint: string }) {}

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const registrationId = randomUUID();
    const registration: Registration = {
      id: registrationId,
      endpoint: request.endpoint,
      functions: [],
    };
    this._registrations.set(registrationId, registration);

    log.info('registered', registration);
    return { registrationId, endpoint: this._options.endpoint };
  }

  async updateRegistration(request: UpdateRegistrationRequest): Promise<void> {
    const registration = this._registrations.get(request.registrationId);
    invariant(registration, `Registration not found: ${request.registrationId}.`);
    registration.functions.push(...(request.functions ?? []));
  }

  async unregister({ registrationId }: UnregisterRequest): Promise<void> {
    if (this._registrations.delete(registrationId)) {
      log.info('unregistered', { registrationId });
    }
  }

  async invoke(invocation: FunctionInvocation): Promise<FunctionInvocationResult> {
    const registration = [...this._registrations.values()].find((reg) =>
      reg.functions.some(({ route }) => '/' + invocation.route === route),
    );
    if (!registration) {
      throw new Error(`Function not found: ${invocation.route} `);
    }

    const url = path.join(registration.endpoint, invocation.route);
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
