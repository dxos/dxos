//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Rpc from 'effect/rpc/Rpc';
import * as RpcGroup from 'effect/rpc/RpcGroup';
import * as Schema from 'effect/Schema';

import * as Events from './Events.ts';
import * as IndexState from './IndexState.ts';

/**
 * The contract between the browser and the server. Deliberately thin: `Watch` streams the project's
 * log and `Dispatch` appends to it, so almost everything the UI does is an event in flight rather
 * than a method. The remaining calls are the ones that are genuinely questions or requests — what
 * projects exist, make or delete one, what model am I talking to, and what is the indexer doing.
 */

export class ProjectRecord extends Schema.Class<ProjectRecord>('code-index/Project')({
  id: Schema.String,
  title: Schema.String,
  created: Schema.Number,
}) {}

export class ServerInfo extends Schema.Class<ServerInfo>('code-index/ServerInfo')({
  root: Schema.String,
  provider: Schema.String,
  model: Schema.String,
  /** Quads in the index; a zero here is why an agent has nothing to say. */
  quads: Schema.Number,
  files: Schema.Number,
  /** Symbol declarations, as of the last pass; absent until the first count finishes. */
  declarations: Schema.optional(Schema.Number),
}) {}

/**
 * One index resource, as a diagram box that names it in `ref` shows it: what it states and how much
 * points at it. `iri` is absent when the target matched nothing or several things equally.
 */
export class Entity extends Schema.Class<Entity>('code-index/Entity')({
  iri: Schema.optional(Schema.String),
  outgoing: Schema.Array(
    Schema.Struct({ predicate: Schema.String, object: Schema.String, objectKind: Schema.Literals(['iri', 'literal']) }),
  ),
  incomingCounts: Schema.Array(Schema.Struct({ predicate: Schema.String, count: Schema.Number })),
  /** Equally good matches, when the target was a name several resources carry. */
  candidates: Schema.Array(Schema.String),
  hint: Schema.optional(Schema.String),
}) {}

/** `dir` is a directory on the way to a package; `folder` and `file` are a package's own `src` tree. */
export const TreeNodeKind = Schema.Literals([
  'repo',
  'dir',
  'package',
  'entry',
  'folder',
  'file',
  'namespace',
  'symbol',
]);
export type TreeNodeKind = typeof TreeNodeKind.Type;

export class TreeNode extends Schema.Class<TreeNode>('code-index/TreeNode')({
  id: Schema.String,
  label: Schema.String,
  kind: TreeNodeKind,
  /** Whether the node can have children; a leaf is never asked for them. */
  branch: Schema.Boolean,
  /** The declaration kind of a symbol (`function`, `interface`, …), or a package's directory name. */
  detail: Schema.optional(Schema.String),
}) {}

export class TreeChildren extends Schema.Class<TreeChildren>('code-index/TreeChildren')({
  id: Schema.String,
  children: Schema.Array(TreeNode),
}) {}

/** The code behind a repository tree node, as its card in the stack shows it. */
export class TreeSource extends Schema.Class<TreeSource>('code-index/TreeSource')({
  id: Schema.String,
  title: Schema.String,
  /** What the node is: a symbol's declaration kind, or `module`, `package`. */
  subtitle: Schema.String,
  /** Repository-relative path of the file the code comes from. */
  path: Schema.optional(Schema.String),
  /** 1-based line of the excerpt's first line. */
  line: Schema.Number,
  code: Schema.String,
  /** Lines cut from the end, so the card can say the excerpt is partial. */
  truncated: Schema.Boolean,
}) {}

/** A Cmd+P result: the node it names, addressed as the tree addresses it so `TreeLocate` can place it. */
export class SearchHit extends Schema.Class<SearchHit>('code-index/SearchHit')({
  node: TreeNode,
  /** Where it lives, for the result row: a symbol's canonical name and package, or a path. */
  description: Schema.String,
}) {}

/** Id of the tree's root, whose children are the repositories. */
export const TREE_ROOT = 'root';

export class RequestFailed extends Schema.TaggedError<RequestFailed>('code-index/RequestFailed')('RequestFailed', {
  message: Schema.String,
}) {}

export class Rpcs extends RpcGroup.make(
  Rpc.make('Info', { success: ServerInfo, error: RequestFailed }),

  Rpc.make('ListProjects', { success: Schema.Array(ProjectRecord), error: RequestFailed }),

  Rpc.make('CreateProject', {
    payload: { title: Schema.optional(Schema.String) },
    success: ProjectRecord,
    error: RequestFailed,
  }),

  /** Deletes a project and its log, stopping any turn it is running; false when there was none. */
  Rpc.make('DeleteProject', {
    payload: { projectId: Schema.String },
    success: Schema.Boolean,
    error: RequestFailed,
  }),

  /** Resolves an IRI or a name (a path, a package, a symbol) to the index resource it names. */
  Rpc.make('Describe', {
    payload: { target: Schema.String },
    success: Entity,
    error: RequestFailed,
  }),

  /** The children of each named tree node; the tree tab asks for a level ahead of what is open. */
  Rpc.make('TreeChildren', {
    payload: { ids: Schema.Array(Schema.String) },
    success: Schema.Array(TreeChildren),
    error: RequestFailed,
  }),

  /** Where a node sits in the tree: ids from below the root down to it, or to its nearest shown ancestor. */
  Rpc.make('TreeLocate', {
    payload: { id: Schema.String },
    success: Schema.optional(Schema.Array(Schema.String)),
    error: RequestFailed,
  }),

  /** Packages, files and exported declarations whose name contains the query, best match first. */
  Rpc.make('Search', {
    payload: { query: Schema.String },
    success: Schema.Array(SearchHit),
    error: RequestFailed,
  }),

  /** The code behind a tree node, for its card; absent for a node with none (a directory). */
  Rpc.make('TreeSource', {
    payload: { id: Schema.String },
    success: Schema.optional(TreeSource),
    error: RequestFailed,
  }),

  /** The indexer's status now, then every change — the footer's live line. */
  Rpc.make('WatchIndex', {
    success: IndexState.Status,
    error: RequestFailed,
    stream: true,
  }),

  /**
   * Everything the UI does to a project. A prompt is an event the server answers by running a
   * turn; a `CanvasCleared` or a `TitleSet` is an event and nothing more. The client does not need
   * to know which is which, and the server decides by tag.
   */
  Rpc.make('Dispatch', {
    payload: { projectId: Schema.String, event: Events.Event },
    success: Schema.Void,
    error: RequestFailed,
  }),

  /** The log from `after`, then everything appended after it — replay and live tail in one stream. */
  Rpc.make('Watch', {
    payload: { projectId: Schema.String, after: Schema.optional(Schema.Number) },
    success: Events.Entry,
    error: RequestFailed,
    stream: true,
  }),
) {}

/** Where the RPC endpoint is mounted; the client prepends it and the dev server routes on it. */
export const PATH = '/rpc';
