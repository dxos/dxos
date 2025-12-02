//
// Copyright 2025 DXOS.org
//

export { App } from "./components/App";
export { Chat } from "./components/Chat";
export { Input } from "./components/Input";
export { Message } from "./components/Message";
export { StatusBar } from "./components/StatusBar";

export { useMessages } from "./hooks/useMessages";

export { theme, colorize } from "./theme";
export type { Theme } from "./theme";

export type { Message as MessageType, MessageRole, ChatState } from "./types";

/**
 * Start the enhanced terminal UI.
 */
export { render } from "ink";
