//
// Copyright 2025 DXOS.org
//

import { render } from '@solidjs/testing-library';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { beforeEach, describe, expect, test } from 'vitest';

import { RegistryProvider, defaultRegistry, useRegistry } from './registry.ts';

describe('registry', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  describe('useRegistry', () => {
    test('returns the default registry', () => {
      let capturedRegistry: AtomRegistry.AtomRegistry | null = null;

      function TestComponent() {
        capturedRegistry = useRegistry();
        return <div>test</div>;
      }

      render(() => <TestComponent />);
      expect(capturedRegistry).toBe(defaultRegistry);
    });
  });

  describe('RegistryProvider', () => {
    test('provides a custom registry to children', () => {
      const customRegistry = AtomRegistry.make();
      let capturedRegistry: AtomRegistry.AtomRegistry | null = null;

      function Child() {
        capturedRegistry = useRegistry();
        return <div>child</div>;
      }

      render(() => (
        <RegistryProvider registry={customRegistry}>
          <Child />
        </RegistryProvider>
      ));

      expect(capturedRegistry).toBe(customRegistry);

      // Clean up
      customRegistry.dispose();
    });
  });
});
