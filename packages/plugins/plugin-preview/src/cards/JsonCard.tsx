//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Next } from '@dxos/react-ui/next';

export const JsonCard = ({ data }: { data: unknown }) => {
  const [open, setOpen] = useState(false);
  // JSON.stringify throws on circular references / unsupported values (e.g. BigInt); keep the card stable.
  let collapsedLength = 0;
  try {
    collapsedLength = JSON.stringify(data)?.length ?? 0;
  } catch {}
  return (
    <Next.Card.Row>
      <Next.Block classNames='self-start'>
        <Next.SystemButton.Disclosure
          variant='ghost'
          size='sm'
          label='Toggle JSON'
          expanded={open}
          onExpandedChange={setOpen}
        />
      </Next.Block>
      {(open && <JsonHighlighter data={data} classNames='col-span-full max-h-[20lh] py-1.5 text-xs' />) || (
        <Next.Card.Text variant='description'>{collapsedLength}</Next.Card.Text>
      )}
    </Next.Card.Row>
  );
};
