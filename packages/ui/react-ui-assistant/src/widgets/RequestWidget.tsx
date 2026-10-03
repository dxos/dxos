//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Button, Icon, useTranslation } from '@dxos/react-ui';
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
  const { t } = useTranslation(translationKey);
  const request = useMemo(() => decodeRequest(safeParseJson(getXmlTextChild(children ?? []) ?? '')), [children]);
  if (request._tag === 'None' || typeof message !== 'string') {
    return null;
  }

  const { requestId, title, options, resolution } = request.value;
  const chosen = options.find((option) => option.id === resolution?.optionId);
  return (
    <div className='flex flex-col gap-2 p-2 border border-subdued-separator rounded-md' data-testid='assistant.request'>
      <div className='flex items-center gap-2 text-sm'>
        <Icon icon='ph--shield-warning--regular' size='md' />
        <span>{title}</span>
      </div>
      {resolution ? (
        <div className='text-sm text-subdued'>
          {chosen ? t('request.answered.label', { option: chosen.label }) : t('request.cancelled.label')}
        </div>
      ) : (
        <div role='group' className='flex flex-wrap gap-2'>
          {options.map((option) => (
            <Button
              key={option.id}
              variant={option.kind.startsWith('allow') ? 'primary' : 'default'}
              data-action='respond'
              data-message={message}
              data-request={requestId}
              data-option={option.id}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
