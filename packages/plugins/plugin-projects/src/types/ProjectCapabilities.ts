//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { Extension } from '@codemirror/state';
import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';
import type * as Schema from 'effect/Schema';
import type { ComponentType, ReactNode } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Translations from '@dxos/app-toolkit/Translations';
import * as Project from '@dxos/compute/Project';
import type * as Spec from '@dxos/compute/Spec';
import type { SourceKey } from '@dxos/deus/review';
import type { SpecIndex } from '@dxos/deus/spec-index';
import type { Database, Obj } from '@dxos/echo';
import type { FormFieldAction } from '@dxos/react-ui-form';
import type * as Tag from '@dxos/react-ui/Tag';

import { ProjectsNamespace } from '../namespace.ts';
import type * as SpecSession from './SpecSession.ts';

/**
 * Id of the built-in default template. Declared here (rather than on the template itself) so callers
 * that create a project without the picker can name it without importing the template module.
 */
export const DefaultTemplateId = 'org.dxos.project.default';

/**
 * A project template contributed by a plugin: instructions text, skills, context objects, and
 * starter routines pre-wired for a domain (mirrors `RoutineCapabilities.Template`). The create
 * dialog and domain entry points (e.g. a mailbox's "Set up project") list contributed templates and
 * run the chosen template's `scaffold`.
 */
export type Template = {
  /** Stable id (e.g. 'org.dxos.project.default'). */
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

export const Template = Capability.make<Template>()(`${ProjectsNamespace.key}.capability.template`);

// Inline import so the `Settings` namespace does not collide with the capability of the same name.
export const Settings = Capability.makeSingleton<Atom.Writable<import('./Settings.ts').Settings>>()(
  `${ProjectsNamespace.key}.capability.settings`,
);

/**
 * How a spec's text is written to its file and read back, since the spec holds parts of it as objects. A file sync uses
 * the first codec that handles a spec, and copies the text as it is when none does.
 */
export type SpecCodec = {
  /**
   * The file text for the spec, written against `base`, the file text last synced, so what did not change keeps its
   * form; undefined when the codec does not handle the spec.
   */
  readonly write: (spec: Spec.Spec, options: { base?: string }) => Promise<string | undefined>;
  /** Takes the file's text into the spec; false when the codec does not handle it. */
  readonly read: (spec: Spec.Spec, text: string, options: { path: string }) => Promise<boolean>;
};

export const SpecCodec = Capability.make<SpecCodec>()(`${ProjectsNamespace.key}.capability.specCodec`);

export type SpecExtensionOptions = {
  attendableId?: string;
  /** The spec's dialects as the editor renders them; read these, not the spec's, so the editor rebuilds on a change. */
  dialects: readonly string[];
  /** Translates the contributor's own keys, named by its namespace. */
  t: (key: string, options: { ns: string }) => string;
};

/**
 * Extensions for any editor of a spec's text, such as cards for the objects the text embeds. An editor rebuilds when
 * the contributions change, so one may arrive after the editor opens.
 */
export type SpecExtensions = (spec: Spec.Spec, options: SpecExtensionOptions) => Extension[];

export const SpecExtensions = Capability.make<SpecExtensions>()(`${ProjectsNamespace.key}.capability.specExtensions`);

/** How a definition card draws one value of a fact field. */
export type FactStyle = { icon: string; hue: Tag.TagHue };

/**
 * The fields a definition card shows beside its kind, each with a style per known value; a value with no style is shown
 * plain. A block shows a field only when it writes one.
 */
export type SpecFacts = Readonly<Record<string, Readonly<Record<string, FactStyle>>>>;

/**
 * A package of extensions a plugin offers specs: dialects a spec takes or drops together, each a set of block kinds
 * beyond the core and changelog ones. A spec lists the dialects it uses in `dialects`, and a dialect's views and
 * editing show only for those specs.
 */
export type SpecPackage = {
  id: string;
  label: Translations.Label;
  /** The ids a spec's `dialects` lists, as a `.mdl` file's front matter lists them in `extends`. */
  dialects: readonly string[];
  /** The fact fields a definition card shows for the package's blocks, such as a feature's status. */
  facts?: SpecFacts;
};

export const SpecPackage = Capability.make<SpecPackage>()(`${ProjectsNamespace.key}.capability.specPackage`);

/**
 * A view of a spec in one of its companion tabs, offered for the specs using all its `dialects`; the contributor
 * renders it through the `ProjectSurface.SpecView` surface.
 */
export type SpecView = {
  id: string;
  label: Translations.Label;
  icon: string;
  dialects: readonly string[];
  /** The companion tab the view is one of. */
  group: SpecSession.Group;
};

export const SpecView = Capability.make<SpecView>()(`${ProjectsNamespace.key}.capability.specView`);

/** What a spec's companion views read beyond its own text, from where only the contributing plugin can reach. */
export type SpecSources = {
  /** The text diff mode compares the spec with. */
  base?: string;
  /** The texts of the specs the spec names, by `github:` file key. */
  specs?: ReadonlyMap<string, string>;
  /** The specs a `<spec id>#<item>` reference can name. */
  index?: SpecIndex;
  /** Reads a file a review cites. */
  read?: (key: SourceKey) => string | undefined;
  /** Opens what a `github:` key names, such as another spec or code. */
  onOpenSource?: (key: SourceKey) => void;
};

export type SpecSourcesProviderProps = { spec: Spec.Spec; children: (sources: SpecSources) => ReactNode };

/** Gives the companion views of a spec its {@link SpecSources}; the views read none without one. */
export type SpecSourcesProvider = ComponentType<SpecSourcesProviderProps>;

export const SpecSourcesProvider = Capability.make<SpecSourcesProvider>()(
  `${ProjectsNamespace.key}.capability.specSources`,
);

/** One setting in a {@link ConfigGroup}; `value` is a writable atom so the form never knows where it is stored. */
export type ConfigField = {
  /** Unique within the group. */
  key: string;
  /** Its `title` and `description` annotations label the field. */
  schema: Schema.Top;
  value: (project: Project.Project) => Atom.Writable<any, any>;
  /** Hides the field while false; absent means always shown. */
  enabled?: Atom.Atom<boolean>;
  action?: FormFieldAction;
  /** Sort key within the group, lowest first. */
  order?: number;
};

/** A group of settings in a project's Config section; contributions with the same `id` merge into one group. */
export type ConfigGroup = {
  id: string;
  label: Translations.Label;
  /** Groups sort by it, lowest first. */
  order?: number;
  fields: readonly ConfigField[];
};

export const ConfigGroup = Capability.make<ConfigGroup>()(`${ProjectsNamespace.key}.capability.configGroup`);

/** Contributing a group with this id adds its fields to the project's own Agent group. */
export const AgentConfigGroupId = 'agent';
