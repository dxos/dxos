//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Atom from '@effect-atom/atom/Atom';
import React, { type KeyboardEvent, type MouseEvent, forwardRef, useCallback, useMemo, useState } from 'react';

import type { PaginationResult } from '@dxos/echo-react';
import { Card, Icon, ScrollArea } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Avatar, CardTile, Row } from '@dxos/react-ui-card';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Highlighted, buildSnippet } from '@dxos/react-ui-search';
import { type Message } from '@dxos/types';

import { useGmailTags } from '#hooks';

import { getMessageBodyText, getMessageProps } from '../../util';
import { type InboxStackItem, type MessageGroup } from './InboxStack';

// Kept out of `InboxStack.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

export const isMessageGroup = (item: InboxStackItem): item is MessageGroup => 'messages' in item;
