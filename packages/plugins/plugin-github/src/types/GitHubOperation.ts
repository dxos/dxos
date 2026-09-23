//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
// Referenced in the emitted .d.ts of the operations (via `ConnectorSpec`'s schemas); importing it
// lets TypeScript name it (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { Connection } from '@dxos/link';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';
import * as PageAction from '@dxos/plugin-crx/PageAction';
import { PullRequest } from '@dxos/types';

import * as Walkthrough from './Walkthrough.ts';

/**
 * Discovery only — list GitHub repositories the connection's token can see.
 * Returns one descriptor per repo across all the user's orgs (and personal
 * account). Read-only: NEVER materializes local objects — materialization is
 * handled by the connector's `materializeTarget` when a `Cursor` is created.
 *
 * Orgs and their members are NOT presented as sync targets — they are
 * auto-synced as part of the sync of any repo they own.
 */
export const GetGitHubRepositories = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.getRepositories'),
    name: 'Get GitHub Repositories',
    description: 'List GitHub repositories reachable from a connection without materializing local objects.',
    icon: 'ph--github-logo--regular',
  },
  input: ConnectorSpec.GetSyncTargetsInput,
  output: ConnectorSpec.GetSyncTargetsOutput,
});

/**
 * Find-or-create the empty local root Project for a selected GitHub repo so a
 * cursor can reference it as its `spec.target`. Keyed by the repo's
 * GitHub foreign id (`remoteTarget.id`), so it is idempotent across re-selection.
 */
export const MaterializeGitHubTarget = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.materializeTarget'),
    name: 'Materialize GitHub Target',
    description: 'Create the empty local root Project bound to a selected GitHub repository.',
    icon: 'ph--github-logo--regular',
  },
  input: ConnectorSpec.MaterializeTargetInput,
  output: ConnectorSpec.MaterializeTargetOutput,
});

/**
 * Per-target options. `maxDaysBack` caps how far back issues/PRs are pulled
 * (mirrors the Gmail mailbox `daysBack`). Default — when unset — is "sync
 * everything ever opened or edited."
 */
export const SyncOptions = Schema.Struct({
  maxDaysBack: Schema.Number.annotate({
    title: 'Sync history (days)',
    description: 'Pull issues and PRs updated within this many days. Leave empty to sync everything.',
  }).pipe(Schema.optional),
});

export interface SyncOptions extends Schema.Schema.Type<typeof SyncOptions> {}

/**
 * Reconcile GitHub data for every repo bound to a connection (one cursor per repo).
 *
 * Pull-then-push per bound repo: auto-upsert its owning org + members,
 * three-way merge the repo as a Project and its issues/PRs as Tasks (respecting
 * `maxDaysBack` if set), then push diverged Project/Task fields back to GitHub.
 * Sync state (`lastTick`/`lastError`/`spec.snapshots`) is written onto each binding.
 */
export const SyncGitHubRepositories = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.syncRepositories'),
    name: 'Sync GitHub Repositories',
    description: 'Reconcile every bound GitHub repo plus its owning org, members, issues, PRs, and comments.',
    icon: 'ph--arrows-clockwise--regular',
  },
  input: ConnectorSpec.SyncInput,
  output: Schema.Struct({
    pulled: Schema.Struct({
      organizations: Schema.Number,
      people: Schema.Number,
      projects: Schema.Number,
      tasks: Schema.Number,
      comments: Schema.Number,
    }),
  }),
}).pipe(Operation.visible);

/**
 * Import a pull request named by a github.com URL or `owner/repo#123` into the space, so it can be
 * opened, reviewed and walked through without waiting for a sync of the whole repository.
 *
 * Idempotent by coordinates — a pull request the space already holds is returned as it stands
 * rather than duplicated.
 */
export const ImportPullRequest = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.importPullRequest'),
    name: 'Import Pull Request',
    description: 'Add a pull request to the space, named by its URL or as owner/repo#number.',
    icon: 'ph--git-pull-request--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    /** A github.com pull request URL, or `owner/repo#123`. */
    reference: Schema.String,
  }),
  output: Schema.Struct({
    pullRequest: Ref.Ref(PullRequest.PullRequest),
    /** False where the space already held the pull request, which is then returned unchanged. */
    imported: Schema.Boolean,
  }),
  types: [PullRequest.PullRequest],
}).pipe(Operation.visible, Operation.mutation('write'));

/**
 * Import the pull request the browser extension is looking at, named by the page's own URL.
 *
 * Separate from {@link ImportPullRequest} because the extension bridge invokes every page action
 * with the fixed `{ snapshot, target }` shape and reads an `{ id }` back. Nothing is extracted from
 * the page: the URL in the snapshot's source names the pull request, and GitHub is the authority on
 * everything else.
 */
export const ImportPullRequestFromSnapshot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.importPullRequestFromSnapshot'),
    name: 'Open pull request in Composer',
    description: "Import the pull request a browser page shows, named by that page's URL.",
    icon: 'ph--git-pull-request--regular',
  },
  input: Schema.Struct({
    snapshot: PageAction.Snapshot,
    target: Database.Database.annotate({ description: 'The database to add the pull request to.' }),
  }),
  output: Schema.Struct({
    id: Schema.String,
  }),
  types: [PullRequest.PullRequest],
}).pipe(Operation.mutation('write'));

/**
 * Generate a walkthrough of a pull request: one markdown document narrating the change in reading
 * order, with its diff chunks spliced in from the patch itself.
 *
 * Idempotent by commit — a walkthrough already generated for the pull request's head is returned
 * unchanged unless `force` says otherwise, since the answer cannot have changed.
 */
export const GenerateWalkthrough = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.generateWalkthrough'),
    name: 'Generate Walkthrough',
    description: "Narrate a pull request as one markdown document, with the change's diffs embedded in it.",
    icon: 'ph--path--regular',
  },
  input: Schema.Struct({
    pullRequest: Ref.Ref(PullRequest.PullRequest),
    /** Regenerate even where a walkthrough for this head already exists. */
    force: Schema.Boolean.pipe(Schema.optional),
  }),
  output: Schema.Struct({
    walkthrough: Ref.Ref(Walkthrough.Walkthrough),
    /** Whether the model ran, as against an existing walkthrough being returned unchanged. */
    generated: Schema.Boolean,
    /** Hunks the prose accounts for, over the patch's total. */
    covered: Schema.Number,
    total: Schema.Number,
  }),
  types: [Walkthrough.Walkthrough, PullRequest.PullRequest],
  // `AiService` must be declared, not merely provided: the invoker builds the runtime from THIS list
  // and `Layer.orDie` clears a layer's error channel, never its requirement.
  services: [Trace.TraceService, AiService.AiService],
}).pipe(Operation.visible);

/**
 * Submit an approving review on a pull request, as the space's GitHub connection.
 *
 * Falls back to a marked conversation comment where GitHub refuses the review — the author's own
 * pull request, or a token with no review permission — so the approval is still recorded and still
 * detectable by an agent deciding whether the pull request is good to land.
 */
export const SubmitPullRequestApproval = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.submitPullRequestApproval'),
    name: 'Submit Pull Request Approval',
    description: 'Submit an approving review on a pull request, or record the approval as a comment.',
    icon: 'ph--check-circle--regular',
  },
  input: Schema.Struct({
    pullRequest: Ref.Ref(PullRequest.PullRequest),
    /** Optional review summary. */
    body: Schema.String.pipe(Schema.optional),
  }),
  output: Schema.Struct({
    /** Set where the approving review was accepted. */
    reviewId: Schema.Number.pipe(Schema.optional),
    /** Set instead where the approval was recorded as a comment. */
    commentId: Schema.Number.pipe(Schema.optional),
    url: Schema.String.pipe(Schema.optional),
    /** Whether the approval is a comment rather than a review. */
    commented: Schema.Boolean,
  }),
  types: [PullRequest.PullRequest],
});

/** Post a conversation comment on a pull request, as the space's GitHub connection. */
export const AddPullRequestComment = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.addPullRequestComment'),
    name: 'Add Pull Request Comment',
    description: 'Post a comment on a pull request.',
    icon: 'ph--chat-text--regular',
  },
  input: Schema.Struct({
    pullRequest: Ref.Ref(PullRequest.PullRequest),
    body: Schema.String,
  }),
  output: Schema.Struct({
    commentId: Schema.Number,
    url: Schema.String.pipe(Schema.optional),
  }),
  types: [PullRequest.PullRequest],
});

/** Post a review comment on one line of a pull request's diff, as the space's GitHub connection. */
export const AddPullRequestReviewComment = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.addPullRequestReviewComment'),
    name: 'Add Pull Request Review Comment',
    description: 'Post a review comment on a line of a pull request diff.',
    icon: 'ph--chat-centered-text--regular',
  },
  input: Schema.Struct({
    pullRequest: Ref.Ref(PullRequest.PullRequest),
    body: Schema.String,
    /** Head SHA the line numbers refer to; a walkthrough's `commit`. */
    commit: Schema.String,
    path: Schema.String,
    line: Schema.Number,
    /** `LEFT` for the removed side, `RIGHT` for added and context lines. */
    side: Schema.Literals(['LEFT', 'RIGHT']),
  }),
  output: Schema.Struct({
    commentId: Schema.Number,
    url: Schema.String.pipe(Schema.optional),
  }),
  types: [PullRequest.PullRequest],
});

/** Aggregate outcome of a commit's check runs; `none` when the commit has no checks at all. */
export const CiState = Schema.Literals(['success', 'failure', 'pending', 'none']);
export type CiState = Schema.Schema.Type<typeof CiState>;

export const CheckCounts = Schema.Struct({
  total: Schema.Number,
  passed: Schema.Number,
  failed: Schema.Number,
  pending: Schema.Number,
});
export interface CheckCounts extends Schema.Schema.Type<typeof CheckCounts> {}

/** Read a pull request's live state and the CI outcome of its head commit from GitHub. */
export const GetPullRequestStatus = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.github.getPullRequestStatus'),
    name: 'Get Pull Request Status',
    description: "Read a pull request's state and the CI status of its head commit.",
    icon: 'ph--git-pull-request--regular',
  },
  input: Schema.Struct({
    pullRequest: Ref.Ref(PullRequest.PullRequest),
  }),
  output: Schema.Struct({
    state: PullRequest.State,
    title: Schema.String,
    commit: Schema.String.pipe(Schema.optional),
    ci: CiState,
    checks: CheckCounts,
  }),
  types: [PullRequest.PullRequest],
});

/**
 * Progress key for {@link GenerateWalkthrough}, derived from the pull request rather than passed, so
 * the UI can watch a run it did not start. The absolute URI form is required: a hydration-dependent
 * one would not match the key the producer mints.
 */
export const createWalkthroughProgressKey = (pullRequest: PullRequest.PullRequest): string =>
  Obj.getURI(pullRequest, { prefer: 'absolute' }).toString() + '#walkthrough';
