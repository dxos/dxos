//
// Copyright 2023 DXOS.org
//

/**
 * Timeout for making rpc connections from remote proxies.
 */
export const PROXY_CONNECTION_TIMEOUT = 30_000;

/**
 * Timeout for the device to be added to the trusted set during auth.
 */
export const AUTH_TIMEOUT = 30_000;

/**
 * Timeout for how long the remote client will wait before assuming the connection is lost.
 */
export const STATUS_TIMEOUT = 10_000;

/**
 * Timeout for waiting before stealing resource lock.
 */
export const RESOURCE_LOCK_TIMEOUT = 3_000;

/**
 * Timeout for space properties to be loaded in the set of tracked items.
 * Accounts for latency between SpaceService reporting the space as READY and DataService streaming the item states.
 */
export const LOAD_PROPERTIES_TIMEOUT = 3_000;

/**
 * Timeout for creating new spaces.
 */
export const CREATE_SPACE_TIMEOUT = 5_000;

/**
 * Timeout for loading of control feeds.
 */
export const LOAD_CONTROL_FEEDS_TIMEOUT = 3_000;
