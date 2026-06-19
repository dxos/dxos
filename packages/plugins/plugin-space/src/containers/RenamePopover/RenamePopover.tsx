//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Entity, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Space, isSpace } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type RenameSubject = Space | Entity.Unknown;

const getName = (subject: RenameSubject): string =>
  (isSpace(subject) ? subject.properties.name : Entity.getLabel(subject)) ?? '';

const setName = (subject: RenameSubject, name: string): void => {
  if (isSpace(subject)) {
    Obj.update(subject.properties, (properties) => {
      properties.name = name;
    });
  } else {
    Entity.update(subject, () => Entity.setLabel(subject, name));
  }
};

export type RenamePopoverProps = { subject: RenameSubject };

/**
 * Inline rename popover anchored to a navtree row. Commits on Enter or when dismissed; Escape cancels.
 */
export const RenamePopover = ({ subject }: RenamePopoverProps) => {
  const { t } = useTranslation(meta.id);
  const space = isSpace(subject);
  const { invokePromise } = useOperationInvoker();
  const [name, setNameState] = useState(() => getName(subject));

  // Commit the latest value when the popover is dismissed (Enter, click-outside, or blur), unless cancelled.
  const nameRef = useRef(name);
  nameRef.current = name;
  const cancelledRef = useRef(false);
  // Enter commits then closes, which unmounts and runs the cleanup commit; guard against a duplicate write.
  const committedRef = useRef(false);

  const commit = useCallback(() => {
    try {
      if (!cancelledRef.current && !committedRef.current) {
        committedRef.current = true;
        setName(subject, nameRef.current);
      }
    } catch (err) {
      log.error('Failed to rename', { err });
    }
  }, [subject]);

  useEffect(() => commit, [commit]);

  const close = useCallback(() => {
    void invokePromise(LayoutOperation.UpdatePopover, { anchorId: '', state: false });
  }, [invokePromise]);

  return (
    <div className='p-2'>
      <Input.Root>
        <Input.Label srOnly>{t(space ? 'space-name.label' : 'object-name.label')}</Input.Label>
        <Input.TextInput
          autoFocus
          value={name}
          placeholder={t(space ? 'unnamed-space.label' : 'object.placeholder')}
          data-testid='spacePlugin.rename.input'
          onChange={({ target: { value } }) => setNameState(value)}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commit();
              close();
            } else if (event.key === 'Escape') {
              // Own the dismissal so it does not also bubble to the deck popover's escape handler,
              // whose divergent teardown leaves stale state that makes the next open flicker.
              event.preventDefault();
              event.stopPropagation();
              cancelledRef.current = true;
              close();
            }
          }}
        />
      </Input.Root>
    </div>
  );
};
