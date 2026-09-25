//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Card, Icon, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

/** What the details card shows, as a read-only form: one row per fact about the pull request. */
export const PullRequestDetailsSchema = Schema.Struct({
  reference: Schema.String.annotate({ title: 'Pull request' }),
  state: Schema.optional(Schema.String.annotate({ title: 'State' })),
  checks: Schema.optional(Schema.String.annotate({ title: 'Checks' })),
  branches: Schema.optional(Schema.String.annotate({ title: 'Branches' })),
});

export type PullRequestDetailsValues = Schema.Schema.Type<typeof PullRequestDetailsSchema>;

export type PullRequestDetailsProps = { values: PullRequestDetailsValues };

/** The pull request's identity, state, CI outcome and branches. */
export const PullRequestDetails = ({ values }: PullRequestDetailsProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Card.Root fullWidth data-testid='pull-request.details'>
      <Card.Header>
        <Card.Block>
          <Icon icon='ph--git-pull-request--regular' />
        </Card.Block>
        <Card.Title>{t('details.label')}</Card.Title>
      </Card.Header>
      <Card.Body>
        <Form.Root schema={PullRequestDetailsSchema} values={values} layout='static' readonly>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </Card.Body>
    </Card.Root>
  );
};
