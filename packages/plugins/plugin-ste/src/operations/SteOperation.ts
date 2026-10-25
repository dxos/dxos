//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const Finding = Schema.Struct({
  location: Schema.String.annotate({ description: 'Where the error is: "paragraph N" or "list".' }),
  rule: Schema.String.annotate({ description: 'The ASD-STE100 rule number.' }),
  message: Schema.String.annotate({ description: 'The error and the correction to make.' }),
});

export const Verify = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.ste.verify'),
    name: 'VerifySimplifiedTechnicalEnglish',
    description:
      'Checks text or Markdown against the Simplified Technical English (ASD-STE100) writing rules. ' +
      'Returns the errors, the warnings, and the words that are not in the approved word list.',
    icon: 'ph--text-aa--regular',
  },
  input: Schema.Struct({
    text: Schema.String.annotate({
      description: 'The text to check. Code blocks, inline code, URLs and quoted text are not checked.',
    }),
    mode: Schema.optional(Schema.Literals(['procedural', 'descriptive', 'mixed'])).annotate({
      description:
        'The type of text. Procedural sentences have a maximum of 20 words, descriptive sentences 25. Default: mixed.',
    }),
    vocabulary: Schema.optional(Schema.Boolean).annotate({
      description: 'Compare the words with the approved word list. Default: true.',
    }),
  }),
  output: Schema.Struct({
    passed: Schema.Boolean.annotate({ description: 'True when the text has no errors.' }),
    errors: Schema.Array(Finding),
    warnings: Schema.Array(Finding),
    unknownWords: Schema.Array(Schema.String).annotate({
      description:
        'Words that are not in the approved word list, most frequent first. ' +
        'Each must be a technical name or a technical verb, or you must replace it.',
    }),
  }),
});
