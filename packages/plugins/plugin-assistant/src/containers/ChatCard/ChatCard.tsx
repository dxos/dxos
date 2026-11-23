//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';

import { AssistantNamespace } from '../../namespace.ts';

export type ChatCardProps = AppSurface.ObjectCardProps<Chat.Chat>;

/** A chat as a card: its name. Lanes are not shown here, since deriving them means folding the chat's whole feed. */
export const ChatCard = ({ subject }: ChatCardProps) => {
  const { t } = Hooks.useTranslation(AssistantNamespace.key);
  const [name] = useObject(subject, 'name');
  return (
    <Card.Body>
      <Card.Row>
        <Card.Title lines={2}>{name ?? t('object-name.placeholder', { ns: Obj.getTypename(subject) })}</Card.Title>
      </Card.Row>
    </Card.Body>
  );
};

ChatCard.displayName = 'ChatCard';

export default ChatCard;
