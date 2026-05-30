//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AiService } from '@dxos/ai';
import { ServiceNotAvailableError } from '@dxos/compute';

import { isAiServiceUnavailable } from './ai-gate';

describe('isAiServiceUnavailable', () => {
  test('true for a ServiceNotAvailableError naming the AiService tag (structured context)', ({ expect }) => {
    const error = new ServiceNotAvailableError(AiService.AiService.key);
    expect(isAiServiceUnavailable(error)).toBe(true);
  });

  test('true for an error whose message carries the AiService key (context lost across the boundary)', ({
    expect,
  }) => {
    // The process-invocation boundary can flatten a structured error to a plain Error; the gate
    // must still recognise it from the formatted message the LayerStack produces.
    const error = new Error(
      `ServiceNotAvailable: Service not available: ${AiService.AiService.key} (affinity=process) [space=<missing>]`,
    );
    expect(isAiServiceUnavailable(error)).toBe(true);
  });

  test('false for a ServiceNotAvailableError for a different service', ({ expect }) => {
    const error = new ServiceNotAvailableError('@dxos/echo/Database');
    expect(isAiServiceUnavailable(error)).toBe(false);
  });

  test('false for an unrelated error', ({ expect }) => {
    expect(isAiServiceUnavailable(new Error('boom'))).toBe(false);
  });

  test('false for non-error values', ({ expect }) => {
    expect(isAiServiceUnavailable(undefined)).toBe(false);
    expect(isAiServiceUnavailable('nope')).toBe(false);
  });
});
