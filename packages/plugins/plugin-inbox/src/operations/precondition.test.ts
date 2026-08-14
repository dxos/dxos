//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import { describe, expect, it } from 'vitest';

import { unmetPrecondition } from './precondition';

const failWith = (error: unknown) => Cause.fail(error);

describe('unmetPrecondition', () => {
  it('names the service from the structured context', () => {
    const cause = failWith({
      message: 'Service not available: @dxos/pipeline-rdf/FactStore',
      context: { service: '@dxos/pipeline-rdf/FactStore' },
    });
    expect(unmetPrecondition(cause)).toBe('@dxos/pipeline-rdf/FactStore unavailable');
  });

  it('falls back to the message when the error was flattened across the invocation boundary', () => {
    // The structured context is what a `ServiceNotAvailableError` carries; crossing the process
    // boundary can leave only the printed message, which is why the fallback exists at all.
    const cause = failWith(new Error('Service not available: @dxos/pipeline-rdf/FactStore'));
    expect(unmetPrecondition(cause)).toBe('@dxos/pipeline-rdf/FactStore unavailable');
  });

  it('stops at the tag, not the rendered context suffix', () => {
    const cause = failWith(
      new Error('Service not available: @dxos/pipeline-rdf/FactStore: {"service":"@dxos/pipeline-rdf/FactStore"}'),
    );
    expect(unmetPrecondition(cause)).toBe('@dxos/pipeline-rdf/FactStore unavailable');
  });

  it('reports both AI flavours as one condition', () => {
    // A missing AiService is a missing service like any other, but users experience "the assistant is
    // not up" as one thing, so it keeps its own wording rather than naming the tag.
    const cause = failWith({
      message: 'Service not available: @dxos/ai/AiService',
      context: { service: '@dxos/ai/AiService' },
    });
    expect(unmetPrecondition(cause)).toBe('ai unavailable (assistant not ready)');
  });

  it('returns undefined for a genuine failure, so the cascade still aborts', () => {
    expect(unmetPrecondition(failWith(new Error('Response failed with code 401')))).toBeUndefined();
    expect(unmetPrecondition(failWith('nope'))).toBeUndefined();
    expect(unmetPrecondition(failWith(undefined))).toBeUndefined();
    expect(unmetPrecondition(failWith({ context: null, message: 'unrelated' }))).toBeUndefined();
  });

  it('finds the service in a defect, which is how an orDie layer surfaces one', () => {
    const cause = Cause.die(new Error('Service not available: @dxos/pipeline-rdf/FactStore'));
    expect(unmetPrecondition(cause)).toBe('@dxos/pipeline-rdf/FactStore unavailable');
  });
});
