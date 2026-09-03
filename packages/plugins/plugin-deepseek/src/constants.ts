//
// Copyright 2026 DXOS.org
//

/** `Connector.id` / `Connection.connectorId` for the DeepSeek connector. */
export const DEEPSEEK_CONNECTOR_ID = 'org.dxos.plugin.deepseek.connector';

/** Matches `AccessToken.source`, which is how `CredentialsService` resolves the API key. */
export const DEEPSEEK_SOURCE = 'deepseek.com';

/** `Skill.key` for the DeepSeek harness skill. */
export const DEEPSEEK_SKILL_KEY = 'org.dxos.skill.deepseek';

/** Environment variable the harness reads the API key from inside the sandbox. */
export const DEEPSEEK_API_KEY_ENV = 'DEEPSEEK_API_KEY';

/** Environment variable naming the API host, so a harness defaulting to another vendor is redirected. */
export const DEEPSEEK_BASE_URL_ENV = 'DEEPSEEK_BASE_URL';

/** DeepSeek's OpenAI-compatible API host. */
export const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

/** Environment variable naming the model, so the model is chosen without guessing a CLI flag. */
export const DEEPSEEK_MODEL_ENV = 'DEEPSEEK_MODEL';

/**
 * npm package installed into the sandbox to provide the harness CLI. Overridable per call:
 * DeepSeek's CLI distribution is not pinned by this plugin.
 */
export const DEFAULT_HARNESS_PACKAGE = 'deepseek-cli';

/** Executable the harness package installs on PATH. */
export const DEFAULT_HARNESS_BIN = 'deepseek';

/** Name given to the sandbox provisioned for the harness. */
export const DEFAULT_SANDBOX_NAME = 'DeepSeek harness';

/** Bounds one harness run; a coding harness is far slower than a shell command, so well above exec's default. */
export const DEFAULT_RUN_TIMEOUT_MS = 600_000;
