//
// Copyright 2022 DXOS.org
//

export interface ConfigPluginOpts {
  /**
   * Root directory of the project.
   */
  root?: string;

  /**
   * Path to the DX config files, defaults to current working directory.
   */
  configPath?: string;

  /**
   * Path to the environment variable overrides for DX config.
   */
  envPath?: string;

  /**
   * Path to the development overrides for DX config.
   */
  devPath?: string;

  /**
   * If set to `production` then config loaders behave differently:
   * - `Local` returns an empty object
   * - `Dynamics` is enabled and makes an HTTP request to the well known config endpoint for config.
   */
  mode?: string;

  /**
   * Public URL of the published app. Also used to load the dynamic config.
   *
   * @default ''
   */
  publicUrl?: string;

  /**
   * Environment variables to be passed to the app.
   */
  env?: string[];
}
