//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Can we generate this?

/**
 * @export
 * @interface DeleteFunctionRequest
 */
export interface DeleteFunctionRequest {
  /**
   * Name of deployed function
   * @type {string}
   * @memberof DeleteFunctionRequest
   */
  functionName: string;
}

/**
 * @export
 * @interface FunctionDefinition
 */
export interface FunctionDefinition {
  /**
   * Name of deployed function
   * @type {string}
   * @memberof FunctionDefinition
   */
  service: string;
  /**
   * Network, usually func_functions for Swarm (deprecated)
   * @type {string}
   * @memberof FunctionDefinition
   */
  network?: string;
  /**
   * Docker image in accessible registry
   * @type {string}
   * @memberof FunctionDefinition
   */
  image: string;
  /**
   * Process for watchdog to fork
   * @type {string}
   * @memberof FunctionDefinition
   */
  envProcess: string;
  /**
   * Overrides to environmental variables
   * @type {{ [key: string]: string; }}
   * @memberof FunctionDefinition
   */
  envVars?: { [key: string]: string };
  /**
   *
   * @type {Array<string>}
   * @memberof FunctionDefinition
   */
  constraints?: Array<string>;
  /**
   * A map of labels for making scheduling or routing decisions
   * @type {{ [key: string]: string; }}
   * @memberof FunctionDefinition
   */
  labels?: { [key: string]: string };
  /**
   * A map of annotations for management, orchestration, events and build tasks
   * @type {{ [key: string]: string; }}
   * @memberof FunctionDefinition
   */
  annotations?: { [key: string]: string };
  /**
   *
   * @type {Array<string>}
   * @memberof FunctionDefinition
   */
  secrets?: Array<string>;
  /**
   * Private registry base64-encoded basic auth (as present in ~/.docker/config.json)
   * @type {string}
   * @memberof FunctionDefinition
   */
  registryAuth?: string;
  /**
   *
   * @type {FunctionDefinitionLimits}
   * @memberof FunctionDefinition
   */
  limits?: FunctionDefinitionLimits;
  /**
   *
   * @type {FunctionDefinitionLimits}
   * @memberof FunctionDefinition
   */
  requests?: FunctionDefinitionLimits;
  /**
   * Make the root filesystem of the function read-only
   * @type {boolean}
   * @memberof FunctionDefinition
   */
  readOnlyRootFilesystem?: boolean;
}

/**
 * @export
 * @interface FunctionDefinitionLimits
 */
export interface FunctionDefinitionLimits {
  /**
   *
   * @type {string}
   * @memberof FunctionDefinitionLimits
   */
  memory?: string;
  /**
   *
   * @type {string}
   * @memberof FunctionDefinitionLimits
   */
  cpu?: string;
}

/**
 * @export
 * @interface FunctionListEntry
 */
export interface FunctionListEntry {
  /**
   * The name of the function
   * @type {string}
   * @memberof FunctionListEntry
   */
  name: string;
  /**
   * The fully qualified docker image name of the function
   * @type {string}
   * @memberof FunctionListEntry
   */
  image: string;
  /**
   * The amount of invocations for the specified function
   * @type {number}
   * @memberof FunctionListEntry
   */
  invocationCount: number;
  /**
   * The current minimal ammount of replicas
   * @type {number}
   * @memberof FunctionListEntry
   */
  replicas: number;
  /**
   * The current available amount of replicas
   * @type {number}
   * @memberof FunctionListEntry
   */
  availableReplicas: number;
  /**
   * Process for watchdog to fork
   * @type {string}
   * @memberof FunctionListEntry
   */
  envProcess: string;
  /**
   * A map of labels for making scheduling or routing decisions
   * @type {{ [key: string]: string; }}
   * @memberof FunctionListEntry
   */
  labels: { [key: string]: string };
  /**
   * A map of annotations for management, orchestration, events and build tasks
   * @type {{ [key: string]: string; }}
   * @memberof FunctionListEntry
   */
  annotations?: { [key: string]: string };
}

/**
 * @export
 * @interface Info
 */
export interface Info {
  /**
   *
   * @type {InfoProvider}
   * @memberof Info
   */
  provider: InfoProvider;
  /**
   *
   * @type {InfoVersion}
   * @memberof Info
   */
  version: InfoVersion;
  /**
   * Platform architecture
   * @type {string}
   * @memberof Info
   */
  arch?: string;
}

/**
 * The OpenFaaS Provider
 * @export
 * @interface InfoProvider
 */
export interface InfoProvider {
  /**
   *
   * @type {string}
   * @memberof InfoProvider
   */
  provider?: string;
  /**
   *
   * @type {string}
   * @memberof InfoProvider
   */
  orchestration?: string;
  /**
   *
   * @type {InfoProviderVersion}
   * @memberof InfoProvider
   */
  version?: InfoProviderVersion;
}

/**
 * Version of the OpenFaaS Provider
 * @export
 * @interface InfoProviderVersion
 */
export interface InfoProviderVersion {
  /**
   *
   * @type {string}
   * @memberof InfoProviderVersion
   */
  commitMessage?: string;
  /**
   *
   * @type {string}
   * @memberof InfoProviderVersion
   */
  sha?: string;
  /**
   *
   * @type {string}
   * @memberof InfoProviderVersion
   */
  release?: string;
}

/**
 * Version of the Gateway
 * @export
 * @interface InfoVersion
 */
export interface InfoVersion {
  /**
   *
   * @type {string}
   * @memberof InfoVersion
   */
  commitMessage?: string;
  /**
   *
   * @type {string}
   * @memberof InfoVersion
   */
  sha?: string;
  /**
   *
   * @type {string}
   * @memberof InfoVersion
   */
  release?: string;
}

/**
 * @export
 * @interface LogEntry
 */
export interface LogEntry {
  /**
   * the function name
   * @type {string}
   * @memberof LogEntry
   */
  name?: string;
  /**
   * the name/id of the specific function instance
   * @type {string}
   * @memberof LogEntry
   */
  instance?: string;
  /**
   * the timestamp of when the log message was recorded
   * @type {Date}
   * @memberof LogEntry
   */
  timestamp?: Date;
  /**
   * raw log message content
   * @type {string}
   * @memberof LogEntry
   */
  text?: string;
}

/**
 * @export
 * @interface Secret
 */
export interface Secret {
  /**
   * Name of secret
   * @type {string}
   * @memberof Secret
   */
  name: string;
  /**
   * Value of secret in plain-text
   * @type {string}
   * @memberof Secret
   */
  value?: string;
}

/**
 * @export
 * @interface SecretName
 */
export interface SecretName {
  /**
   * Name of secret
   * @type {string}
   * @memberof SecretName
   */
  name?: string;
}
