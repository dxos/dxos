//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import { ContentBlock } from '@dxos/types';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';
import { safeParseJson } from '@dxos/util';

import { translationKey } from '../translations.ts';

const decodeRequest = Schema.decodeUnknownOption(ContentBlock.Request);

export type RequestWidgetProps = WidgetProps<{ message?: unknown }>;

/**
 * An agent waiting for permission, as a card with the options it offered. A choice is reported
 * through the thread's delegated `respond` action, like the select and suggestion widgets' `submit`.
 * Once answered (or abandoned) the card shows the outcome instead of the buttons.
 */
export const RequestWidget = ({ children, message }: RequestWidgetProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const request = useMemo(() => decodeRequest(safeParseJson(getXmlTextChild(children ?? []) ?? '')), [children]);
  if (request._tag === 'None' || typeof message !== 'string') {
    return null;
  }

  const { requestId, title, options, resolution } = request.value;
  const chosen = options.find((option) => option.id === resolution?.optionId);
  return (
    <Card.Root data-testid='assistant.request'>
      <Card.Header>
        <Layout.Block>
          <Icon.Icon icon='ph--shield-warning--regular' />
        </Layout.Block>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Body>
        {resolution ? (
          <Card.Description>
            {chosen ? t('request.answered.label', { option: chosen.label }) : t('request.cancelled.label')}
          </Card.Description>
        ) : (
          <Layout.Flex role='group' wrap gap='sm'>
            {options.map((option) => (
              <Button.Root
                key={option.id}
                variant={option.kind.startsWith('allow') ? 'primary' : 'default'}
                data-action='respond'
                data-message={message}
                data-request={requestId}
                data-option={option.id}
              >
                {option.label}
              </Button.Root>
            ))}
          </Layout.Flex>
        )}
      </Card.Body>
    </Card.Root>
  );
};
