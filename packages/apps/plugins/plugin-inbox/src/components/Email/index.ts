//
// Copyright 2024 DXOS.org
//

import React from 'react';

// Lazily load components for content surfaces.
export const MailboxMain = React.lazy(() => import('./MailboxMain'));
export const MailboxArticle = React.lazy(() => import('./MailboxArticle'));
