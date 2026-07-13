//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Message } from '@dxos/types';

import { EditMessage } from '#components';
import { useEmailComposerExtensions, useSendEmail } from '#hooks';
import { meta } from '#meta';

import { InboxOperation, Mailbox } from '../../types';
import { REPLY_REGEXP } from '../../util';

export type EditMessageArticleProps = AppSurface.ObjectArticleProps<Message.Message>;

export const EditMessageArticle = ({ role, subject, attendableId }: EditMessageArticleProps) => {
  const db = Obj.getDatabase(subject);
  const spaceId = db?.spaceId;
  const extensions = useEmailComposerExtensions(subject);
  const onSend = useSendEmail(subject);

  // Generate: fill the reply draft's body from the message it replies to (thread + facts grounded).
  // Only offered for reply drafts scoped to a resolvable mailbox.
  const { invokePromise } = useOperationInvoker();
  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  const mailbox = mailboxes.find((candidate) => Obj.getURI(candidate) === subject.properties?.mailbox);
  const canGenerate = mailbox !== undefined && !!subject.properties?.inReplyTo;
  // Remounts the editor after a generated body lands (the editor only reads its initial value).
  const [generation, setGeneration] = useState(0);
  const handleGenerate = useCallback(async () => {
    if (!mailbox || !spaceId) {
      return;
    }
    const result = await invokePromise(
      InboxOperation.GenerateReply,
      { mailbox: Ref.make(mailbox), message: subject },
      { spaceId },
    );
    const body = result?.data?.body;
    if (body) {
      Obj.update(subject, (subject) => {
        const textBlock = subject.blocks.find((block) => block._tag === 'text');
        const existing = textBlock && 'text' in textBlock ? textBlock.text : '';
        const quoteMatch = REPLY_REGEXP.exec(existing);
        const next = quoteMatch ? `${body}\n\n${existing.slice(quoteMatch.index)}` : body;
        if (textBlock && 'text' in textBlock) {
          textBlock.text = next;
        } else {
          subject.blocks.push({ _tag: 'text', text: next });
        }
      });
      setGeneration((current) => current + 1);
    }
  }, [invokePromise, mailbox, spaceId, subject]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .root({ label: ['draft-toolbar.label', { ns: meta.profile.key }] })
        .subgraph(
          canGenerate &&
            ((builder) =>
              builder.action(
                'generate',
                {
                  label: ['draft-toolbar-generate.menu', { ns: meta.profile.key }],
                  icon: 'ph--sparkle--regular',
                  testId: 'inbox.draft.generate',
                },
                handleGenerate,
              )),
        )
        .build(),
    [canGenerate, handleGenerate],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar>
        <Menu.Root {...menuActions} attendableId={attendableId} alwaysActive>
          <Menu.Toolbar />
        </Menu.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <EditMessage key={generation} message={subject} extensions={extensions} onSend={onSend} />
      </Panel.Content>
    </Panel.Root>
  );
};

EditMessageArticle.displayName = 'EditMessageArticle';
