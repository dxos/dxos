//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { type StashedLink } from '../types/StashedLink.ts';

// #region article
export type StashedLinkArticleProps =
  AppSurface.ObjectArticleProps<StashedLink>;

export const StashedLinkArticle = ({
  role,
  subject,
}: StashedLinkArticleProps) => {
  // A snapshot that re-renders the component when the object changes, here or
  // on another peer.
  const [link] = useObject(subject);

  return (
    <Panel.Root role={role}>
      <Panel.Body asChild>
        <Layout.Flex column gap='sm' classNames='p-2'>
          <Input.Root
            placeholder='Title'
            value={link.title ?? ''}
            onChange={(event) =>
              Obj.update(subject, (subject) => {
                subject.title = event.target.value;
              })
            }
          />
          <Input.Root
            placeholder='https://'
            value={link.url ?? ''}
            onChange={(event) =>
              Obj.update(subject, (subject) => {
                subject.url = event.target.value;
              })
            }
          />
          <Input.Textarea
            placeholder='Why is this worth keeping?'
            value={link.note ?? ''}
            onChange={(event) =>
              Obj.update(subject, (subject) => {
                subject.note = event.target.value;
              })
            }
          />
          <p className='text-description'>
            {link.read ? 'Read' : 'Not read yet'}
          </p>
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};
// #endregion

export default StashedLinkArticle;
