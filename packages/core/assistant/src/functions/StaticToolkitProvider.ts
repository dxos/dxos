import { Context, Layer } from 'effect';
import { GenericToolkit } from '../session';
import { Rx } from '@effect-rx/rx';

/**
 * Provides a system-defined toolkit that can be used in blueprints.
 */
export class StaticToolkitProvider extends Context.Tag('@dxos/assistant/StaticToolkitProvider')<
  StaticToolkitProvider,
  {
    toolkit: Rx.Rx<GenericToolkit.GenericToolkit>;
  }
>() {
  static layerEffect = Layer.succeed(StaticToolkitProvider, {
    toolkit: Rx.make(() => GenericToolkit.empty),
  });
}
