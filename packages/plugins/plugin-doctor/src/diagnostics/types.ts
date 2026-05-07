//
// Copyright 2026 DXOS.org
//

import type { CapabilityManager } from '@dxos/app-framework';
import type { Client } from '@dxos/client';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

/**
 * A single problem produced by a diagnostic provider.
 */
export type DiagnosticIssue = {
  /** Stable identifier within the provider — used as a React key. */
  readonly id: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  /** Optional secondary label (e.g. object id, blueprint key). */
  readonly subjectLabel?: string;
  readonly spaceId?: string;
};

/**
 * Context passed to a diagnostic provider when it runs.
 */
export type DiagnosticContext = {
  readonly client: Client;
  readonly capabilities: CapabilityManager.CapabilityManager;
  readonly reportProgress: (message: string) => void;
  readonly signal: AbortSignal;
};

/**
 * A diagnostic provider — plugins contribute these via `DoctorCapabilities.DiagnosticProvider`.
 * The runner invokes `run` and surfaces the returned issues in the UI.
 */
export type DiagnosticProvider = {
  readonly id: string;
  /** i18n key to display in the UI. Resolved against the doctor plugin's translations namespace. */
  readonly label: string;
  readonly description?: string;
  readonly run: (ctx: DiagnosticContext) => Promise<DiagnosticIssue[]>;
};

/**
 * Result of running a single diagnostic provider.
 */
export type DiagnosticRunResult = {
  readonly providerId: string;
  readonly label: string;
  readonly issues: DiagnosticIssue[];
  readonly durationMs: number;
  /** Set when the provider itself threw. */
  readonly error?: string;
};
