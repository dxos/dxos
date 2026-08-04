//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import * as Effect from 'effect/Effect';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { type Capabilities } from '@dxos/app-framework';
import { type Graph } from '@dxos/app-graph';
import { Database, Filter, Obj, Ref, Tag } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { normalizeText } from '@dxos/markdown';
import { Card, ScrollArea, type ThemedClassName, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { Avatar, Row } from '@dxos/react-ui-card';
import { Html, emailDialect } from '@dxos/react-ui-components';
import { Menu, type MenuActions, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { TagIndex } from '@dxos/schema';
import { type Actor, ContentBlock, DraftMessage, type Message as MessageType } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { useCidResolver, useEmailComposerExtensions, useMessageTags, useSendEmail } from '#hooks';
import { meta } from '#meta';
import { Mailbox, SystemTags } from '#types';

import { createDraftMessage, getMessageProps } from '../../util';
import { EditMessage } from '../EditMessage';
import { MarkdownViewer } from '../MarkdownViewer';
import { type ViewMode, viewModeGroup } from '../ViewMode';
import { type MessageOrRef } from './ConversationStack';
import { ExtractorMenuItem } from './useExtractorActions';
import { useMessageExtractedObjects } from './useMessageExtractedObjects';
import { useMessageActions } from './useToolbar';

// Kept out of `ConversationStack.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Stable id for a message or unresolved ref, keying tiles and collapse state. */
export const keyOf = (message: MessageOrRef): string =>
  Ref.isRef(message) ? String(message.uri) : Obj.getURI(message);
