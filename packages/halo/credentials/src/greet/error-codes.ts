//
// Copyright 2020 DXOS.org
//

/**
 * Any general error condition.
 * @type {string}
 */
export const ERR_GREET_GENERAL = 'ERR_GREET_GENERAL';

/**
 * The Greeting command is unrecognized.
 * @type {string}
 */
export const ERR_GREET_INVALID_COMMAND = 'ERR_GREET_INVALID_COMMAND';

/**
 * The Greeting command has invalid state (eg, commands were re-executed, or executed out-of-order).
 * @type {string}
 */
export const ERR_GREET_INVALID_STATE = 'ERR_GREET_INVALID_STATE';

/**
 * The invitation does not exist or the attempted access to it was unauthorized.
 * @type {string}
 */
export const ERR_GREET_INVALID_INVITATION = 'ERR_GREET_INVALID_INVITATION';

/**
 * The message type of a submitted message is not allowed or invalid.
 * @type {string}
 */
export const ERR_GREET_INVALID_MSG_TYPE = 'ERR_GREET_INVALID_MSG_TYPE';

/**
 * The nonce on a submitted message does not match the expected value.
 * @type {string}
 */
export const ERR_GREET_INVALID_NONCE = 'ERR_GREET_INVALID_NONCE';

/**
 * The supplied party is not one known or serviced by this Greeter.
 * @type {string}
 */
export const ERR_GREET_INVALID_PARTY = 'ERR_GREET_INVALID_PARTY';

/**
 * The signature on a submitted message cannot be verified.
 * @type {string}
 */
export const ERR_GREET_INVALID_SIGNATURE = 'ERR_GREET_INVALID_SIGNATURE';

/**
 * Greeter is alreary connected to supplied party.
 * @type {string}
 */
export const ERR_GREET_ALREADY_CONNECTED_TO_SWARM = 'ERR_GREET_ALREADY_CONNECTED_TO_SWARM';

/**
 * The connection to supplied party timed out.
 * @type {string}
 */
export const ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT = 'ERR_GREET_CONNECTED_TO_SWARM_TIMEOUT';
