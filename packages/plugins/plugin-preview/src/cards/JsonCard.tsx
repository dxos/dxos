//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';

import { PreviewNamespace } from '../namespace.ts';

export const JsonCard = ({ data }: { data: unknown }) => {
  const { t } = Hooks.useTranslation(PreviewNamespace.key);
  const [open, setOpen] = useState(false);
  // JSON.stringify throws on circular references / unsupported values (e.g. BigInt); keep the card stable.
  let collapsedLength = 0;
  try {
    collapsedLength = JSON.stringify(data)?.length ?? 0;
  } catch {}
  return (
    <>
      <Card.Row
        leading={
          <SystemButton.Disclosure
            variant='ghost'
            size='sm'
            label={t('json-card.toggle.label')}
            expanded={open}
            onExpandedChange={setOpen}
          />
        }
      >
        <Card.Text variant='muted'>{t('json-card.size.label', { count: collapsedLength })}</Card.Text>
      </Card.Row>
      {open && (
        <Card.Poster position='end' classNames='bg-group-surface'>
          <JsonHighlighter data={data} classNames='max-h-[200px] overflow-auto px-3 py-2 text-xs' />
        </Card.Poster>
      )}
    </>
  );
};
