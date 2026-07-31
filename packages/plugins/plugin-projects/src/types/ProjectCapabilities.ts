//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import type { Project } from '@dxos/compute';
import type { Database, Obj } from '@dxos/echo';

import { meta } from '#meta';

/**
 * Id of the built-in blank template. Declared here (rather than on the template itself) so callers
 * that create a project without the picker can name it without importing the template module.
 */
export const BlankTemplateId = 'org.dxos.project.blank';

/**
 * A project template contributed by a plugin: instructions text, skills, context objects, and
 * starter routines pre-wired for a domain (mirrors `RoutineCapabilities.Template`). The create
 * dialog and domain entry points (e.g. a mailbox's "Set up project") list contributed templates and
 * run the chosen template's `scaffold`.
 */
export type Template = {
  /** Stable id (e.g. 'org.dxos.project.blank'). */
  id: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** Optional Phosphor icon name. */
  icon?: string;
  /**
   * Whether this template applies to the given subject. The subject is the object the project is
   * being created for (e.g. a Mailbox), or undefined in the global create dialog. Templates that
   * need a specific subject gate themselves here. Defaults to always-applies.
   */
  appliesTo?: (subject?: Obj.Unknown) => boolean;
  /**
   * Build the project as a fully-wired in-memory graph — the project plus its owned instructions
   * and artifacts collection (and any starter routines), all parented. The create flow persists it
   * with a single `Database.add` cascade; scaffold must NOT call `Database.add` itself.
   * `Database.Service` may still be used for read-only lookups (e.g. loading a subject's feed ref).
   */
  scaffold: (ctx: { name?: string; subject?: Obj.Unknown }) => Effect.Effect<Project.Project, Error, Database.Service>;
};

export const Template = Capability.make<Template>()(`${meta.profile.key}.capability.template`);
