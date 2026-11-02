//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * The part of the Cloudflare OS Workshop API (`@gadgets/workshop-shared/api`) this plugin calls.
 *
 * Vendored rather than depended on: the package is not published, and the deployment and its API
 * move together, so only the calls used here are declared, copied from cloudflare/cloudflare-os
 * `packages/workshop-shared/src/api.ts` at e3c995c.
 */

import { type RpcStub, type RpcTarget } from 'capnweb';

/** Prepended to the username to salt the client-side password hash (`api.ts` `SERVICE_SALT`). */
export const SERVICE_SALT = new Uint8Array([
  0xd9, 0x4e, 0x54, 0x1d, 0x29, 0xc1, 0x03, 0x74, 0x73, 0x7e, 0xb3, 0xe3, 0x34, 0x6d, 0x8f, 0x21,
]);

export type WorkpieceId = number;

export type AuthorInfo = {
  type: 'user' | 'agent' | 'gadget';
  id: string;
  name: string;
};

export type ServerConfig = {
  passwordAuthEnabled: boolean;
  signupsEnabled: boolean;
  siteName?: string;
  backendVersion?: string;
};

export type WorkspaceMetadata = {
  id: string;
  title: string;
  totalCost?: number;
  pinned?: boolean;
  lastActive?: Date;
};

export type ChatMetadata = {
  id: number;
  title: string;
  started: Date;
  lastActive: Date;
  /** Present while an agent turn runs; its absence marks the turn as finished. */
  activeAgent?: AuthorInfo;
  /** Gadgets with changes the chat proposed that nobody has merged yet. */
  proposedChangeWorkpieces?: WorkpieceId[];
};

export type ToolCall = {
  toolCallId: string;
  toolName: string;
  input?: unknown;
  error?: string;
};

export type ChatMessage = {
  chatId: number;
  sequence: number;
  timestamp: Date;
  author: AuthorInfo;
} & (
  | { type: 'message'; message: string; reasoning?: string; toolCalls?: ToolCall[] }
  | { type: 'changes'; createdGadgets?: WorkpieceId[] }
  | { type: 'action'; actionId?: number }
  | { type: string }
);

/** One streamed, provisional event; this plugin reads only the text deltas. */
export type ChatStreamEvent = { type: 'textDelta'; text?: string; delta?: string } | { type: string };

export type GadgetSummary = {
  id: WorkpieceId;
  type: 'gadget';
  title: string;
  commitId?: string;
  /** Set while the gadget is pending in a chat that has not merged it. */
  chatId?: number;
};

export type WorkpieceSummary = GadgetSummary | { id: WorkpieceId; type: 'worktree'; title?: string };

export type ActionState = 'pending' | 'approved' | 'rejected';

export type ActionLogEntry = {
  id: number;
  resourceTitle: string;
  resourceUrl?: string;
  createdAt: Date;
  appliedAt?: Date;
  state: ActionState;
} & ({ type: 'action'; description: { title: string; description: string } } | { type: string });

export type MergeChangesResult = { outcome: 'merged' | 'stale' };

export type UiBundle = { jsCode: string };

export interface PublicApi extends RpcTarget {
  ping(): Promise<void>;
  getServerConfig(): Promise<ServerConfig>;
  login(username: string, passwordHash: Uint8Array): Promise<string | null>;
  authenticate(token: string): Promise<RpcStub<AuthenticatedApi>>;
}

export interface AuthenticatedApi extends RpcTarget {
  listWorkspaces(): Promise<WorkspaceMetadata[]>;
  newWorkspace(): Promise<RpcStub<Overseer>>;
  openWorkspace(id: string): Promise<RpcStub<Overseer>>;
}

export interface Overseer extends RpcTarget {
  getMetadata(): Promise<WorkspaceMetadata>;
  setTitle(title: string): Promise<void>;
  subscribeToWorkpieces(subscriber: WorkpiecesSubscriber): Promise<Disposable>;
  getGadget(id: WorkpieceId): Promise<RpcStub<GadgetClient>>;
  listModels(): Promise<AuthorInfo[]>;
  listChats(): Promise<ChatMetadata[]>;
  subscribeToChat(subscriber: ChatSubscriber, startAfter?: Date): Promise<Disposable>;
  newChat(initialMessage: string, modelId: string | null): Promise<number>;
  sendChatMessage(chatId: number, message: string, modelId: string | null): Promise<void>;
  mergeChanges(chatId: number): Promise<MergeChangesResult>;
  revertChanges(chatId: number): Promise<void>;
  stopAgent(chatId: number): Promise<void>;
  listActions(): Promise<{ entries: ActionLogEntry[] }>;
  subscribeToActions(subscriber: ActionsSubscriber, startAfter?: Date): Promise<Disposable>;
  approveAction(id: number): Promise<void>;
  rejectAction(id: number): Promise<void>;
}

export interface GadgetClient extends RpcTarget {
  getUiBundle(chatId?: number): Promise<UiBundle | null>;
  connectToGadget(chatId?: number): Promise<RpcStub<RpcTarget>>;
}

/*
 * Subscriber parameters take the plain interfaces where upstream writes `RpcStub<…>`: capnweb's mapped
 * stub type recurses past TypeScript's instantiation limit on those, and the client passes `RpcTarget`
 * instances, which capnweb sends by reference either way.
 */

export interface WorkpiecesSubscriber {
  entry(summary: WorkpieceSummary): void;
  removed(id: WorkpieceId): void;
  ready(): void;
}

export interface ChatSubscriber {
  streamGeneration(generation: number): void;
  metadata(chat: ChatMetadata): void;
  deleted(chatId: number): void;
  message(message: ChatMessage): void;
  changeApplied(chatId: number, generation: number, revision: number): void;
  stream(chatId: number, event: ChatStreamEvent): void;
}

export interface ActionsSubscriber {
  entry(record: ActionLogEntry): void;
  ready(): void;
}
