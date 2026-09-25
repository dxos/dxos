//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Form } from '@dxos/react-ui-form';

/** What the details card shows, as a read-only form: one row per fact about the pull request. */
export const PullRequestDetailsSchema = Schema.Struct({
  reference: Schema.String.annotate({ title: 'Pull request' }),
  state: Schema.optional(Schema.String.annotate({ title: 'State' })),
  checks: Schema.optional(Schema.String.annotate({ title: 'Checks' })),
  branches: Schema.optional(Schema.String.annotate({ title: 'Branches' })),
});

export type PullRequestDetailsValues = Schema.Schema.Type<typeof PullRequestDetailsSchema>;

export type PullRequestDetailsProps = { values: PullRequestDetailsValues };

/** The pull request's identity, state, CI outcome and branches, as a read-only form. */
export const PullRequestDetails = ({ values }: PullRequestDetailsProps) => (
  <Form.Root schema={PullRequestDetailsSchema} values={values} layout='static' readonly>
    <Form.Viewport>
      <Form.Content data-testid='pull-request.details'>
        <Form.Fields />
      </Form.Content>
    </Form.Viewport>
  </Form.Root>
);
