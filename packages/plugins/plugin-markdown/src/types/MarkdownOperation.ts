//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { trim } from '@dxos/util';

import * as Markdown from './Markdown.ts';

// The edit descriptions feed the markdown skill's LLM tool definition (and its memoized
// fixtures), so the schema stays local and context-tuned; the apply logic is shared via `Text.apply`.
const Edit = Schema.Struct({
  oldString: Schema.optional(
    Schema.String.annotate({
      description: 'The text to find in the document. If undefined, append the newString to the end of the document.',
    }),
  ),
  newString: Schema.String.annotate({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotate({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

/**
 * What a slash-menu command receives: the surface it was triggered on, and the offset the trigger
 * was consumed at. A handler resolves the live view from `MarkdownCapabilities.EditorViews` — the
 * editor is not reachable from the operation layer any other way.
 */
export const EditorCommandInput = Schema.Struct({
  subject: Schema.String.annotate({ description: 'Attendable id (or document id) of the editor surface.' }),
  head: Schema.Number.annotate({ description: 'Document offset the command should insert at.' }),
});

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.create'),
    name: 'Create',
    description: 'Creates a new markdown document and adds it to the space.',
    icon: 'ph--file-text--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String,
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({
      description: 'The DXN of the created document.',
    }),
  }),
});

// TODO(burdon): Remove or disambiguate from create.
export const CreateMarkdown = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.createDraft'),
    name: 'Draft Markdown Document',
    icon: 'ph--file-text--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    object: Type.getSchema(Markdown.Document),
  }),
});

export const Open = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.open'),
    name: 'Open',
    description: 'Opens and reads the contents of a new markdown document.',
    icon: 'ph--arrow-square-out--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({
      description: 'The ID of the markdown document.',
    }),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
});

export const GetSelection = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.getSelection'),
    name: 'Get Selection',
    description:
      "Returns the user's current text selection in the markdown document as anchor/text pairs (empty when nothing is selected).",
    icon: 'ph--selection--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    doc: Schema.optional(
      Ref.Ref(Markdown.Document).annotate({
        description:
          'Optional document to read the selection from. Omit to return the current selection wherever it is — there is no need to call this once per open document.',
      }),
    ),
  }),
  output: Schema.Struct({
    ranges: Schema.Array(
      Schema.Struct({
        anchor: Schema.String.annotate({
          description: 'Anchor of the selected range, usable to target follow-up edits.',
        }),
        text: Schema.String.annotate({ description: 'The selected text.' }),
      }),
    ),
  }),
});

export const ScrollToAnchor = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.scrollToAnchor'),
    name: 'Scroll To Anchor',
    icon: 'ph--anchor-simple--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotate({ description: 'Attendable ID of the markdown editor.' }),
    cursor: Schema.String.annotate({ description: 'Cursor position to scroll to.' }),
    id: Schema.optional(Schema.String.annotate({ description: 'Reference ID (e.g. thread ID).' })),
  }),
  output: Schema.Void,
});

export const CreateCheckpoint = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.createCheckpoint'),
    name: 'Create Checkpoint',
    description: 'Records a named checkpoint of the current document content that can be viewed or restored later.',
    icon: 'ph--bookmark-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({ description: 'The document to checkpoint.' }),
    name: Schema.String.annotate({ description: 'Checkpoint name.' }),
    message: Schema.optional(Schema.String.annotate({ description: 'Optional description of this checkpoint.' })),
  }),
  output: Schema.Struct({
    versionId: Schema.String.annotate({ description: 'The id of the created checkpoint.' }),
  }),
});

export const CreateBranch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.createBranch'),
    name: 'Create Branch',
    description: trim`
      Creates a draft branch of the document. Edit the branch content with the update operation
      by passing the returned branch id as branchId, then merge it back for review.
    `,
    icon: 'ph--git-branch--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({ description: 'The document to branch.' }),
    name: Schema.String.annotate({ description: 'Branch name.' }),
  }),
  output: Schema.Struct({
    branchId: Schema.String.annotate({ description: 'The id of the created branch.' }),
    contentId: Schema.String.annotate({ description: 'The DXN of the branch Text object.' }),
  }),
});

export const SuggestEdit = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.suggestEdit'),
    name: 'Suggest Edit',
    description: trim`
      Find-or-create the caller's suggestion branch of the document (one per author, keyed by creator)
      and return its id. Edit it with the update operation to accrue suggested changes for review;
      unlike a named draft branch, a suggestion branch is space-visible and labelled by its author.
    `,
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({ description: 'The document to suggest edits on.' }),
    // Optional: the runtime supplies the calling agent's identity DID automatically. An agent must
    // NOT set this — leave it undefined so the suggestion is attributed to the agent itself.
    creator: Schema.optional(
      Schema.String.annotate({
        description:
          'Do not set. The author identity DID keying the suggestion branch; filled from the calling agent identity.',
      }),
    ),
  }),
  output: Schema.Struct({
    branchId: Schema.String.annotate({ description: 'The id of the suggestion branch.' }),
    contentId: Schema.String.annotate({ description: 'The DXN of the branch Text object.' }),
  }),
});

export const MergeBranch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.mergeBranch'),
    name: 'Merge Branch',
    description: trim`
      Merges an active branch back into its parent document content (3-way merge;
      conflicting hunks are left in the text with git-style markers).
    `,
    icon: 'ph--git-merge--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({ description: 'The document that owns the branch.' }),
    branchId: Schema.String.annotate({ description: 'The id of the branch to merge.' }),
  }),
  output: Schema.Struct({
    conflicts: Schema.Number.annotate({ description: 'Number of conflicting hunks left in the merged text.' }),
    newContent: Schema.String.annotate({ description: 'The merged document content.' }),
  }),
});

export const GetHistory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.getHistory'),
    name: 'Get History',
    description: 'Lists the checkpoints and branches of a document.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotate({ description: 'The document to inspect.' }),
  }),
  output: Schema.Struct({
    versions: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, createdAt: Schema.String })),
    branches: Schema.Array(
      Schema.Struct({ id: Schema.String, name: Schema.String, status: Schema.String, createdAt: Schema.String }),
    ),
  }),
});

export const Update = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.markdown.update'),
    name: 'Update',
    description: 'Applies a set of edits to the markdown document.',
    icon: 'ph--pencil-simple--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    // Any text-bearing document (an object holding a `content: Ref(Text)`), not only
    // `Markdown.Document` — e.g. outlines. Branch edits remain markdown-only.
    doc: Ref.Ref(Obj.Unknown).annotate({
      description: 'The ID of the document (any text-bearing object, e.g. a markdown document or an outline).',
    }),
    edits: Schema.Array(Edit).annotate({
      description:
        'The edits to apply to the document. Each edit finds oldString and replaces it with newString; omit oldString to append newString to the end.',
    }),
    branchId: Schema.optional(
      Schema.String.annotate({
        description:
          'Apply the edits to this draft branch (the id returned by createBranch) instead of the live document.',
      }),
    ),
  }),
  // A receipt, not the document: the result is fed back to the model verbatim, so returning the
  // whole text charged a full copy of the document per edit — content the model just supplied.
  output: Schema.Struct({
    applied: Schema.Number.annotate({ description: 'Number of edits applied; every edit matched or the call failed.' }),
    length: Schema.Number.annotate({ description: 'Length of the document after the edits.' }),
  }),
});
