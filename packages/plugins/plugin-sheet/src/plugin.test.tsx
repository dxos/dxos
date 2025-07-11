import {
  Events,
  PluginManager,
  useApp,
  type ActivationEvent,
  type AnyCapability,
  type CreateAppOptions,
  type PluginContext,
} from '@dxos/app-framework';
import type { ProviderOrValue } from '@dxos/app-framework/testing';
import { raise } from '@dxos/debug';
import { assertArgument } from '@dxos/invariant';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, test } from 'vitest';
import { SheetPlugin } from './SheetPlugin';

interface WithPluginManagerOptions extends CreateAppOptions {
  capabilities?: ProviderOrValue<PluginContext, AnyCapability[]>;
  fireEvents?: (ActivationEvent | string)[];
}

class PluginTestBench {
  private _pluginManager: PluginManager;

  constructor(options: WithPluginManagerOptions) {
    assertArgument(options.plugins && options.plugins.length > 0, 'at least one plugin is required');
    this._pluginManager = new PluginManager({
      pluginLoader: () => raise(new Error('Not implemented')),
      core: options.plugins?.map(({ meta }) => meta.id) ?? [],
      ...options,
    });
  }

  get pluginManager() {
    return this._pluginManager;
  }

  renderApp() {
    return render(<TestRoot pluginManager={this._pluginManager} />);
  }
}

const TestRoot = ({ pluginManager }: { pluginManager: PluginManager }) => {
  const App = useApp({ pluginManager });

  return <App />;
};

describe('PluginSheet', () => {
  test('activates', async () => {
    const bench = new PluginTestBench({
      plugins: [SheetPlugin()],
    });
    await bench.pluginManager.activate(Events.Startup);
    const app = bench.renderApp();
  });
});
