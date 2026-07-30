//
// Copyright 2026 DXOS.org
//

/**
 * Cross-cut signal set by the agent's `request_reload` tool and read by the
 * `dx agent` command after a non-interactive turn. When set, the process exits
 * with {@link RELOAD_EXIT_CODE} (75) so the hypervisor knows the agent edited
 * code and wants a cooperative restart (the reload gate). Module-level state is
 * safe here: a `dx agent` invocation runs a single turn in one process.
 */

/** Exit code meaning "the agent edited code and wants a restart" (see the harness design, Aspect A). */
export const RELOAD_EXIT_CODE = 75;

let reloadReason: string | undefined;

/** Called by the `request_reload` tool to request a cooperative restart after the turn. */
export const requestReload = (reason: string): void => {
  reloadReason = reason;
};

/** The reason the agent gave for wanting a reload, or `undefined` if none was requested. */
export const getReloadRequest = (): string | undefined => reloadReason;
