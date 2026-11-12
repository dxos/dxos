//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';

import { type Bookmark } from '../types/Bookmark.ts';
import { RecordVisit } from '../types/BookmarkOperation.ts';

// #region article
export type BookmarkArticleProps = AppSurface.ObjectArticleProps<Bookmark>;

export const BookmarkArticle = ({ role, subject }: BookmarkArticleProps) => {
  // A snapshot that re-renders the component when the object changes, here or
  // on another peer.
  const [bookmark] = useObject(subject);

  const handleNameChange = useCallback(
    (name: string) => Obj.update(subject, (subject) => (subject.name = name)),
    [subject],
  );
  // #endregion

  // #region invoke
  const recordVisit = Hooks.useOperation(RecordVisit, () => ({
    bookmark: subject,
  }));
  // #endregion

  // #region render
  return (
    <Panel.Root role={role}>
      <Panel.Body>
        <Input.Root
          value={bookmark.name ?? ''}
          onChange={(event) => handleNameChange(event.target.value)}
        />
        <a
          href={bookmark.url}
          target='_blank'
          rel='noreferrer'
          onClick={() => recordVisit()}
        >
          {bookmark.url}
        </a>
        <p>Visited {bookmark.visits ?? 0} times.</p>
        <Button.Root onClick={() => recordVisit()}>Record visit</Button.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
// #endregion

export default BookmarkArticle;
