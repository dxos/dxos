//
// Copyright 2023 DXOS.org
//

import { DeepSignal } from 'deepsignal/react';

import { Plugin } from '@dxos/react-surface';

export type Params = string | number | boolean | null | undefined;

export type NodeKey = string;
export type RelationKey = string;

export type SessionNode<T extends Record<string, Params> = Record<string, Params>> = {
  id: NodeKey;
  label: string | [string, { ns: string; count?: number }];
  description?: string;
  params?: T;
};

export type SessionGraph = {
  nodes: DeepSignal<Record<NodeKey, SessionNode>>;
  relations: DeepSignal<Record<NodeKey, Record<RelationKey, Set<NodeKey>>>>;
};

export type DataResolver = (node: SessionNode) => any;

export type SessionPluginProvides = { sessionGraph: SessionGraph; dataResolvers: DataResolver[] };

export type SessionPluginParticipant = { session: { resolver: (plugins: Plugin[]) => DataResolver } };

export type SessionContextValue = SessionPluginProvides;
