//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { type Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Agent from '@dxos/assistant/Agent';
import { Filter, type Obj, Ref } from '@dxos/echo';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';
import { AgentState } from '@dxos/plugin-agent/AgentState';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';

export type AgentStateModuleData = {
  /** Name of a markdown document the agent can learn from; shows a Learn action when set. */
  learnFrom?: string;
};

/** The state of the space's first agent — its mode, what it tracks and its knowledge graph — beside the chat. */
export const AgentStateModule = ({ data }: Surface.ComponentProps<AgentStateModuleData>) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <AgentStateModuleContainer space={space} learnFrom={data?.learnFrom} />;
};

const AgentStateModuleContainer = ({ space, learnFrom }: { space: Space; learnFrom?: string }) => {
  const [agent] = useQuery(space.db, Filter.type(Agent.Agent));
  const documents = useQuery(space.db, Filter.type(Markdown.Document));
  const document = learnFrom ? documents.find(({ name }) => name === learnFrom) : undefined;
  const { invokePromise } = useOperationInvoker();
  const [learning, setLearning] = useState(false);

  const handleLearn = useCallback(async () => {
    if (!agent || !document) {
      return;
    }

    setLearning(true);
    try {
      await invokePromise(
        AgentOperation.LearnFromDocument,
        { agent: Ref.make(agent), document: Ref.make<Obj.Unknown>(document) },
        { spaceId: space.db.spaceId },
      );
    } finally {
      setLearning(false);
    }
  }, [invokePromise, agent, document, space]);

  if (!agent) {
    return null;
  }

  return (
    <AgentState
      agent={agent}
      actions={
        document && (
          <Toolbar.IconButton
            icon='ph--book-open-text--regular'
            label={learning ? 'Learning…' : `Learn from "${document.name}"`}
            disabled={learning}
            onClick={handleLearn}
            data-testid='agent-state-learn'
          />
        )
      }
    />
  );
};
