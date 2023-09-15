//
// Copyright 2023 DXOS.org
//

import { randomUUID } from 'node:crypto';

import {
  FunctionRegistryService,
  RegisterRequest,
  RegisterResponse,
  UnregisterRequest,
} from '@dxos/protocols/proto/dxos/agent/functions';

import { FunctionDispatcher, FunctionInvocation, FunctionInvocationResult } from './dispatcher';

type Registration = {
  id: string;
  request: RegisterRequest;
};

export class DevFunctionDispatcher implements FunctionDispatcher, FunctionRegistryService {
  private _registrations: Registration[] = [];

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const registrationId = randomUUID();
    this._registrations.push({
      id: registrationId,
      request,
    });

    return { registrationId };
  }

  async unregister(request: UnregisterRequest): Promise<void> {
    const index = this._registrations.findIndex((registration) => registration.id === request.registrationId);
    if (index >= 0) {
      this._registrations.splice(index, 1);
    }
  }

  async invoke(invocation: FunctionInvocation): Promise<FunctionInvocationResult> {
    const registration = this._registrations.findLast((registration) =>
      registration.request.functions?.some((func) => func.name === invocation.function),
    );
    if (!registration) {
      throw new Error(`Function ${invocation.function} not found`);
    }

    const result = await fetch(`${registration.request.endpoint}/${invocation.function}`, {
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
