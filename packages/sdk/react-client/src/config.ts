import { Config, defs } from "@dxos/config"
import { MaybeFunction, MaybePromise } from "@dxos/util"

/**
 * Config that is passed to components can be wrapped in a promise or a callback.
 */
export type SuppliedConfig = MaybeFunction<MaybePromise<defs.Config | Config>>

export async function unwrapConfig(config: SuppliedConfig): Promise<defs.Config | Config> {
  return typeof config === 'function' ? config() : config;
}
