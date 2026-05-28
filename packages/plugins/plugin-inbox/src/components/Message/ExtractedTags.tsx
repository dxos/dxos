//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { Icon, Popover } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { useExtractedObjects } from '../../hooks';

/**
 * Renders one chip per object extracted from this message (sourced from `ExtractedFrom`
 * relations whose Target is the message). Hovering shows a small preview card; clicking
 * navigates to the object via `LayoutOperation.Open`.
 *
 * The preview card matches a regular object card's chrome (icon + label, drag handle) but
 * renders the drag handle disabled — signals "preview only, drag-to-relate isn't active".
 */
export const ExtractedTags = ({ message }: { message: Message.Message }) => {
  const space = getSpace(message);
  const db = space?.db;
  const objects = useExtractedObjects(db, message);

  if (objects.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-wrap gap-1' data-testid='extracted-tags'>
      {objects.map((object) => (
        <ExtractedTag key={Obj.getURI(object)} object={object} />
      ))}
    </div>
  );
};

const ExtractedTag = ({ object }: { object: Obj.Any }) => {
  const { invokePromise } = useOperationInvoker();
  const [open, setOpen] = useState(false);

  const label = Obj.getLabel(object) ?? Type.getTypename(object) ?? 'object';
  const icon = iconForObject(object);
  const uri = Obj.getURI(object);

  const handleClick = useCallback(() => {
    void invokePromise(LayoutOperation.Open, { subject: [String(uri)] }).catch((err) =>
      log.warn('open extracted object failed', { err, uri: String(uri) }),
    );
  }, [invokePromise, uri]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className='inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-sm bg-input hover:bg-hover-base text-base cursor-pointer'
          onClick={handleClick}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          data-testid={`extracted-tag-${object.id}`}
          aria-label={label}
        >
          <Icon icon={icon} size={4} classNames='text-subdued' />
          <span className='truncate max-w-[20ch]'>{label}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side='bottom'
          align='start'
          onOpenAutoFocus={(event) => event.preventDefault()}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          data-testid='extracted-tag-preview'
        >
          <PreviewCard object={object} icon={icon} label={label} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

const PreviewCard = ({ object, icon, label }: { object: Obj.Any; icon: string; label: string }) => {
  const summary = summarizeObject(object);

  return (
    <div className='flex flex-col gap-2 p-2 min-w-[16rem] max-w-[24rem] bg-base border border-subdued-separator rounded-sm shadow-md'>
      <div className='flex items-center gap-2'>
        <Icon icon={icon} size={4} classNames='text-subdued' />
        <span className='truncate font-medium'>{label}</span>
        <div className='grow' />
        {/* Disabled drag handle — matches regular object card chrome but signals "preview only". */}
        <button
          type='button'
          disabled
          aria-disabled='true'
          aria-label='Drag handle (disabled in preview)'
          tabIndex={-1}
          className='cursor-not-allowed opacity-40'
          data-testid='extracted-tag-preview-drag-handle'
        >
          <Icon icon='ph--dots-six-vertical--regular' size={4} />
        </button>
      </div>
      {summary && <div className='text-sm text-description whitespace-pre-line'>{summary}</div>}
    </div>
  );
};

const iconForObject = (object: Obj.Any): string => {
  const typename = Type.getTypename(object) ?? '';
  if (typename.endsWith('.trip')) {
    return 'ph--airplane-takeoff--regular';
  }
  if (typename.endsWith('.segment')) {
    return 'ph--path--regular';
  }
  if (typename.endsWith('.booking')) {
    return 'ph--ticket--regular';
  }
  if (typename.endsWith('.person')) {
    return 'ph--user--regular';
  }
  return 'ph--cube--regular';
};

const summarizeObject = (object: any): string | undefined => {
  // Heuristic, kind-by-kind summary. Avoids importing each plugin's schema (would create deps).
  if (object?.segments && Array.isArray(object.segments)) {
    return `${object.segments.length} segment${object.segments.length === 1 ? '' : 's'}`;
  }
  if (object?.details?._tag === 'flight') {
    const origin = object.details.origin?.code ?? '?';
    const destination = object.details.destination?.code ?? '?';
    const number = object.details.number ?? '';
    return `${origin} → ${destination}${number ? ` · ${number}` : ''}`;
  }
  if (object?.confirmationCode) {
    return `Confirmation: ${object.confirmationCode}`;
  }
  if (Array.isArray(object?.emails) && object.emails.length > 0) {
    return object.emails[0]?.value;
  }
  return undefined;
};
