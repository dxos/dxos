//
// Copyright 2025 DXOS.org
//

import * as pipe from 'effect/pipe';
import React, { useCallback } from 'react';

import { LayoutAction, chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { type PreviewProps } from '@dxos/plugin-preview';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { meta } from '../../meta';
import { Markdown } from '../../types';
import { getAbstract, getFallbackName } from '../../util';

// TODO(burdon): Factor out.
const getTitle = (subject: Markdown.Document | DataType.Text, fallback: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return subject.name ?? subject.fallbackName ?? getFallbackName(subject.content?.target?.content ?? fallback);
  } else if (Obj.instanceOf(DataType.Text, subject)) {
    return getFallbackName(subject.content);
  }
};

// TODO(burdon): Factor out.
const getSnippet = (subject: Markdown.Document | DataType.Text, fallback: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return getAbstract(subject.content?.target?.content ?? fallback);
  } else if (Obj.instanceOf(DataType.Text, subject)) {
    return getAbstract(subject.content);
  }
};

export type MarkdownCardProps = PreviewProps<Markdown.Document | DataType.Text>;

export const MarkdownCard = ({ subject, role }: MarkdownCardProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { t } = useTranslation(meta.id);
  const snippet = getSnippet(subject, t('fallback abstract'));

  // TODO(wittjosiah): Factor out so this component isn't dependent on the app framework.
  const handleNavigate = useCallback(
    () =>
      dispatch(
        pipe(
          createIntent(LayoutAction.UpdatePopover, {
            part: 'popover',
            subject: null,
            options: { state: false, anchorId: '' },
          }),
          chain(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(subject)] }),
        ),
      ),
    [dispatch, subject],
  );

  return (
    <Card.SurfaceRoot role={role}>
      <Card.Heading>{getTitle(subject, t('fallback title'))}</Card.Heading>
      {snippet && <Card.Text classNames='line-clamp-3 break-words col-span-2'>{snippet}</Card.Text>}
      {role === 'card--popover' && (
        <Card.Chrome>
          <Button onClick={handleNavigate}>
            <span className='grow'>{t('navigate to document label')}</span>
            <Icon icon='ph--arrow-right--regular' />
          </Button>
        </Card.Chrome>
      )}
    </Card.SurfaceRoot>
  );
};
