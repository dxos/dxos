//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

// Chat is implemented alongside Agent (`./agent-chat`): the two types reference each other and
// separate modules would form an import cycle. This facade keeps the `Chat.*` namespace stable.
export { Chat, CompanionTo, LegacyCompanionTo, ensurePlan, getFromContext, make } from './agent-chat';
