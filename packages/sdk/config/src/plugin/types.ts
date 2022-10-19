//
// Copyright 2022 DXOS.org
//

export interface ConfigPluginOpts {
  /**
   * Path to the DX config files, defaults to current working directory.
   */
  configPath?: string

  /**
   * Path to the environment variable overrides for DX config.
   */
  envPath?: string

  /**
   * Path to the development overrides for DX config.
   */
  devPath?: string

  /**
   * The Dynamics() config.yml file is special, it will be loaded if the dynamic property is set to false.
   * If dynamic is set to true each app will try to load from an endpoint (using {publicUrl}/.well-known/dx/config),
   * wire app serve adds config endpoints for each app serving the global config file (~/.wire/remote.yml).
   *
   * The usual pattern is to set it to CONFIG_DYNAMIC env variable.
   * When running app locally this should be set to false or nil to serve local config.
   * And when publishing the app to DXNS the cli-app will set that variable to true automatically.
   *
   * @default false
   */
  dynamic?: boolean

  /**
   * Public URL of the published app. Also used to load the dynamic config.
   *
   * @default ''
   */
  publicUrl?: string
}
