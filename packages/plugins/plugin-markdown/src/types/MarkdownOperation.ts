//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, DXN, Ref, Type } from '@dxos/echo';
import { trim } from '@dxos/util';

import { meta } from '#meta';

import * as Markdown from './Markdown';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

// The edit descriptions feed the markdown skill's LLM tool definition (and its memoized
// fixtures), so the schema stays local and context-tuned; the apply logic is shared via `Text.apply`.
const Edit = Schema.Struct({
  oldString: Schema.optional(
    Schema.String.annotations({
      description:
        'The text to find in the document. Set to undefined to append the newString to the end of the document.',
    }),
  ),
  newString: Schema.String.annotations({
    description: 'The text to replace it with.',
  }),
  replaceAll: Schema.optional(Schema.Boolean).annotations({
    description: 'If true, replaces all occurrences. Defaults to false (first occurrence only).',
  }),
});

export const Create = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.create'),
    name: 'Create',
    description: 'Creates a new markdown document and adds it to the space.',
    icon: 'ph--file-text--regular',
  },
  input: Schema.Struct({
    name: Schema.String,
    content: Schema.String,
  }),
  output: Schema.Struct({
    id: Schema.String.annotations({
      description: 'The DXN of the created document.',
    }),
  }),
  services: [Database.Service],
});

export const CreateMarkdown = Operation.make({
  meta: {
    key: makeKey('create'),
    name: 'Create Markdown Document',
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
    key: DXN.make('org.dxos.function.markdown.open'),
    name: 'Open',
    description: 'Opens and reads the contents of a new markdown document.',
    icon: 'ph--arrow-square-out--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the markdown document.',
    }),
  }),
  output: Schema.Struct({
    content: Schema.String,
  }),
  services: [Database.Service],
});

export const ScrollToAnchor = Operation.make({
  meta: {
    key: makeKey('scrollToAnchor'),
    name: 'Scroll To Anchor',
    icon: 'ph--anchor-simple--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    subject: Schema.String.annotations({ description: 'Attendable ID of the markdown editor.' }),
    cursor: Schema.String.annotations({ description: 'Cursor position to scroll to.' }),
    id: Schema.optional(Schema.String.annotations({ description: 'Reference ID (e.g. thread ID).' })),
  }),
  output: Schema.Void,
});

export const CreateCheckpoint = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.createCheckpoint'),
    name: 'Create Checkpoint',
    description: 'Records a named checkpoint of the current document content that can be viewed or restored later.',
    icon: 'ph--bookmark-simple--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({ description: 'The document to checkpoint.' }),
    name: Schema.String.annotations({ description: 'Checkpoint name.' }),
    message: Schema.optional(Schema.String.annotations({ description: 'Optional description of this checkpoint.' })),
  }),
  output: Schema.Struct({
    versionId: Schema.String.annotations({ description: 'The id of the created checkpoint.' }),
  }),
  services: [Database.Service],
});

export const CreateBranch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.createBranch'),
    name: 'Create Branch',
    description: trim`
      Creates a draft branch of the document. Edit the branch content with the update operation
      by passing the returned branch id as branchId, then merge it back for review.
    `,
    icon: 'ph--git-branch--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({ description: 'The document to branch.' }),
    name: Schema.String.annotations({ description: 'Branch name.' }),
  }),
  output: Schema.Struct({
    branchId: Schema.String.annotations({ description: 'The id of the created branch.' }),
    contentId: Schema.String.annotations({ description: 'The DXN of the branch Text object.' }),
  }),
  services: [Database.Service],
});

export const SuggestEdit = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.suggestEdit'),
    name: 'Suggest Edit',
    description: trim`
      Find-or-create the caller's suggestion branch of the document (one per author, keyed by creator)
      and return its id. Edit it with the update operation to accrue suggested changes for review;
      unlike a named draft branch, a suggestion branch is space-visible and labelled by its author.
    `,
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({ description: 'The document to suggest edits on.' }),
    // Optional: the runtime supplies the calling agent's identity DID automatically. An agent must
    // NOT set this — leave it undefined so the suggestion is attributed to the agent itself.
    creator: Schema.optional(
      Schema.String.annotations({
        description:
          'Do not set. The author identity DID keying the suggestion branch; filled from the calling agent identity.',
      }),
    ),
  }),
  output: Schema.Struct({
    branchId: Schema.String.annotations({ description: 'The id of the suggestion branch.' }),
    contentId: Schema.String.annotations({ description: 'The DXN of the branch Text object.' }),
  }),
  services: [Database.Service],
});

export const MergeBranch = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.mergeBranch'),
    name: 'Merge Branch',
    description: trim`
      Merges an active branch back into its parent document content (3-way merge;
      conflicting hunks are left in the text with git-style markers).
    `,
    icon: 'ph--git-merge--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({ description: 'The document that owns the branch.' }),
    branchId: Schema.String.annotations({ description: 'The id of the branch to merge.' }),
  }),
  output: Schema.Struct({
    conflicts: Schema.Number.annotations({ description: 'Number of conflicting hunks left in the merged text.' }),
    newContent: Schema.String.annotations({ description: 'The merged document content.' }),
  }),
  services: [Database.Service],
});

export const GetHistory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.getHistory'),
    name: 'Get History',
    description: 'Lists the checkpoints and branches of a document.',
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({ description: 'The document to inspect.' }),
  }),
  output: Schema.Struct({
    versions: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, createdAt: Schema.String })),
    branches: Schema.Array(
      Schema.Struct({ id: Schema.String, name: Schema.String, status: Schema.String, createdAt: Schema.String }),
    ),
  }),
  services: [Database.Service],
});

export const Update = Operation.make({
  meta: {
    key: DXN.make('org.dxos.function.markdown.update'),
    name: 'Update',
    description: trim`
      Applies a set of edits to the markdown document.
    `,
    icon: 'ph--pencil-simple--regular',
  },
  input: Schema.Struct({
    doc: Ref.Ref(Markdown.Document).annotations({
      description: 'The ID of the markdown document.',
    }),
    edits: Schema.Array(Edit).annotations({
      description:
        'The edits to apply to the document. Each edit finds oldString and replaces it with newString; omit oldString to append newString to the end.',
    }),
    branchId: Schema.optional(
      Schema.String.annotations({
        description:
          'Apply the edits to this draft branch (the id returned by createBranch) instead of the live document.',
      }),
    ),
  }),
  output: Schema.Struct({
    newContent: Schema.String,
  }),
  services: [Database.Service],
});
