//
// Copyright 2025 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import { render } from '@solidjs/testing-library';
import { beforeEach, describe, expect, test } from 'vitest';

import { RegistryProvider, defaultRegistry, useRegistry } from './registry';

describe('registry', () => {
  beforeEach(() => {
    // Reset the default registry between tests
    defaultRegistry.reset();
  });

  describe('useRegistry', () => {
    test('returns the default registry', () => {
      let capturedRegistry: Registry.Registry | null = null;

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
      const customRegistry = Registry.make();
      let capturedRegistry: Registry.Registry | null = null;

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
