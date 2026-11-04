//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, type Type } from '@dxos/echo';
import type * as PreviewCapabilities from '@dxos/plugin-preview/PreviewCapabilities';
import { type Issue, type PullRequest, Repo } from '@dxos/types';

import { type GitHubLink } from '../extensions/index.ts';
import { GitHubNamespace } from '../namespace.ts';

/**
 * Where a previewed link's repository, pull request or issue comes from. The plugin's default fetches it from
 * the GitHub API with the space's connection token (anonymously when there is none); a host that
 * contributes one — a story, a test, an offline build — replaces the fetch.
 */
export type GitHubLinkSource = (
  link: GitHubLink,
  context: PreviewCapabilities.PreviewLinkContext,
) => Effect.Effect<Repo.Repo | Issue.Issue | PullRequest.PullRequest | undefined>;

export const LinkSource = Capability.make<GitHubLinkSource>()(`${GitHubNamespace.key}.capability.linkSource`);

/** The input of a {@link FileMapping}'s `import` operation. */
export const FileImportInput = Schema.Struct({
  repository: Ref.Ref(Repo.Repo),
  path: Schema.String,
  /** The file as the new commit has it (UTF-8). */
  content: Schema.String,
  /** The file as the marker's commit had it; absent on first import. */
  base: Schema.optional(Schema.String),
  /** The object the marker binds; absent on first import. */
  object: Schema.optional(Ref.Ref(Obj.Unknown)),
  /** The object's Automerge heads at the last sync: apply the base → content change as of these. */
  heads: Schema.optional(Schema.Array(Schema.String)),
});
export interface FileImportInput extends Schema.Schema.Type<typeof FileImportInput> {}

export const FileImportOutput = Schema.Struct({
  object: Ref.Ref(Obj.Unknown),
  /** The heads at which the object holds exactly `content`, recorded on the marker. */
  heads: Schema.Array(Schema.String),
});
export interface FileImportOutput extends Schema.Schema.Type<typeof FileImportOutput> {}

export const FileExportInput = Schema.Struct({
  object: Ref.Ref(Obj.Unknown),
  path: Schema.String,
  /** The file as GitHub holds it for this space: the blob last synced, or last pushed while that is unmerged. */
  base: Schema.optional(Schema.String),
});
export interface FileExportInput extends Schema.Schema.Type<typeof FileExportInput> {}

export const FileExportOutput = Schema.Struct({
  content: Schema.String,
  /** The heads the content was rendered from, recorded on the marker after the commit lands. */
  heads: Schema.Array(Schema.String),
});
export interface FileExportOutput extends Schema.Schema.Type<typeof FileExportOutput> {}

/**
 * How one kind of repository file becomes an ECHO object and back. The owning plugin contributes the
 * entry and implements the two operations; plugin-github invokes them and never parses a file itself.
 */
export type FileMapping = {
  /** Stable id, recorded on every marker the mapping writes, e.g. `org.dxos.plugin.code.spec`. */
  readonly id: string;
  /** Repository-relative globs the mapping claims, e.g. `['**' + '/*.mdl']`: `**` spans directories, `*` stays within one. */
  readonly match: readonly string[];
  /** The ECHO type a matched file becomes. */
  readonly type: Type.AnyObj;
  /** Pull: create the object, or apply a remote change to it. */
  readonly import: Operation.Definition<FileImportInput, FileImportOutput>;
  /** Push: render the object as file content. Absent → the mapping is pull-only. */
  readonly export?: Operation.Definition<FileExportInput, FileExportOutput>;
  /** Largest file the engine imports for this mapping; larger files are skipped and reported. Default 1 MiB. */
  readonly maxBytes?: number;
};

export const FileMapping = Capability.make<FileMapping>()(`${GitHubNamespace.key}.capability.fileMapping`);
