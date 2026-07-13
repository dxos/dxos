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

export type RenameCallback = { initialValue: string; onRename: (name: string) => void };
export type RenameSubject = Space | Entity.Unknown | RenameCallback;

const isRenameCallback = (subject: RenameSubject): subject is RenameCallback =>
  typeof (subject as RenameCallback).onRename === 'function';

const getName = (subject: RenameSubject): string => {
  if (isRenameCallback(subject)) {
    return subject.initialValue;
  }
  return (isSpace(subject) ? subject.properties.name : Entity.getLabel(subject)) ?? '';
};

const setName = (subject: RenameSubject, name: string): void => {
  if (isRenameCallback(subject)) {
    subject.onRename(name);
  } else if (isSpace(subject)) {
    Obj.update(subject.properties, (properties) => {
      properties.name = name;
    });
  } else {
    Entity.update(subject, () => Entity.setLabel(subject, name));
  }
};

export type RenamePopoverProps = { subject: RenameSubject };

// TODO(wittjosiah): Move RenamePopover, RenameSubject, RenameCallback, and RENAME_POPOVER to @dxos/app-toolkit
//   so any plugin can use the rename popover without depending on plugin-space.

/**
 * Inline rename popover anchored to a navtree row. Commits on Enter or when dismissed; Escape cancels.
 */
export const RenamePopover = ({ subject }: RenamePopoverProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = !isRenameCallback(subject) && isSpace(subject);
  const { invokePromise } = useOperationInvoker();
  const [name, setNameState] = useState(() => getName(subject));

  // Commit the latest value when the popover is dismissed (Enter, click-outside, or blur), unless cancelled.
  const nameRef = useRef(name);
  nameRef.current = name;
  const initialNameRef = useRef(name);
  const cancelledRef = useRef(false);
  // Enter commits then closes, which unmounts and runs the dismissal cleanup; guard against a duplicate write.
  const committedRef = useRef(false);

  const write = useCallback(() => {
    try {
      if (!cancelledRef.current && nameRef.current !== initialNameRef.current) {
        setName(subject, nameRef.current);
      }
    } catch (err) {
      log.error('Failed to rename', { err });
    }
  }, [subject]);

  const commit = useCallback(() => {
    if (!committedRef.current) {
      committedRef.current = true;
      write();
    }
  }, [write]);

  // Commit the latest value on dismissal (click-outside/blur) when the component unmounts, unless Enter
  // already committed or Escape cancelled. This must not set committedRef: under StrictMode the mount-time
  // setup/cleanup/setup cycle runs this cleanup before any interaction, and flipping the guard there would
  // suppress the real Enter commit.
  useEffect(
    () => () => {
      if (!committedRef.current) {
        write();
      }
    },
    [write],
  );

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

RenamePopover.displayName = 'RenamePopover';
