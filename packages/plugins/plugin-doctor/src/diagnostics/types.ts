//
// Copyright 2026 DXOS.org
//

import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { type Hypergraph } from '@dxos/echo';
import { type Space } from '@dxos/halo';
import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

/**
 * A single problem produced by a diagnostic provider.
 */
export type DiagnosticIssue = {
  /** Stable identifier within the provider — used as a React key. */
  readonly id: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  /** Optional secondary label (e.g. object id, skill key). */
  readonly subjectLabel?: string;
  readonly spaceId?: string;
};

/**
 * Context passed to a diagnostic provider when it runs.
 */
export type DiagnosticContext = {
  readonly spaces: Space.ServiceApi;
  readonly graph: Hypergraph.Hypergraph;
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
  /** i18n label, either a key in the doctor namespace or a `[key, { ns }]` tuple from another plugin. */
  readonly label: ThemeProvider.Label;
  readonly description?: ThemeProvider.Label;
  readonly run: (ctx: DiagnosticContext) => Promise<DiagnosticIssue[]>;
};

/**
 * Result of running a single diagnostic provider.
 */
export type DiagnosticRunResult = {
  readonly providerId: string;
  readonly label: ThemeProvider.Label;
  readonly issues: DiagnosticIssue[];
  readonly durationMs: number;
  /** Set when the provider itself threw. */
  readonly error?: string;
};
