//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Duration from 'effect/Duration';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useEffect, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useAtomCapabilityState, useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import * as Chat from '@dxos/assistant/Chat';
import * as Process from '@dxos/compute/Process';
import { Annotation, Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { composable, composableProps } from '@dxos/react-ui';
import { useAttentionAttributes, useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import {
  TracePanel as NaturalTracePanel,
  type TracePanelProps as NaturalTracePanelProps,
  type ProcessEnvironment,
  parseProcessEnvironments,
  useExecutionGraph,
  useTraceMessages,
} from '@dxos/react-ui-trace';

import { AssistantCapabilities } from '#types';

export type TracePanelProps = AppSurface.SpaceArticleProps<Pick<NaturalTracePanelProps, 'onProcessTerminate'>>;

/**
 * The trace panel bound to the app: the process monitor, the space's trace feed, the assistant's
 * settings (environment filter, debug view), a view-state process selection, and navigation.
 */
export const TracePanel = composable<HTMLDivElement, TracePanelProps>(
  ({ space, attendableId, onProcessTerminate, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes(attendableId);
    const { invokePromise } = useOperationInvoker();
    const [settings, updateSettings] = useAtomCapabilityState(AssistantCapabilities.Settings);
    const environments = useMemo(
      () => parseProcessEnvironments(settings.traceProcessEnvironments),
      [settings.traceProcessEnvironments],
    );
    const handleEnvironmentsChange = useCallback(
      (traceProcessEnvironments: ProcessEnvironment[]) =>
        updateSettings((settings) => ({ ...settings, traceProcessEnvironments })),
      [updateSettings],
    );

    // The picked processes live in view state keyed by the panel, so they survive a remount; the
    // trace narrows to them and their children.
    const selectedPids = useSelection(attendableId, 'multi');
    const { multi: setSelected } = useSelectionActions(attendableId);

    const monitor = useCapability(Capabilities.ProcessMonitor);
    const processesAtom = useMemo(
      () => monitor?.processTreeAtom.pipe(Atom.debounce(Duration.millis(500))) ?? atomEmpty,
      [monitor],
    );
    const processes = useAtomValue(processesAtom);
    const graph = useExecutionGraph(space, monitor?.processTreeAtom, { selectedPids });

    // A process only knows the feed it serves, so the chat's name is joined in here rather than
    // carried on the process itself.
    const chats = useQuery(space.db, Filter.type(Chat.Chat));
    const chatNamesByFeed = useMemo(() => {
      const names = new Map<string, string>();
      for (const chat of chats) {
        const name = chat.name?.trim();
        if (name) {
          names.set(feedKey(chat.feed.uri), name);
        }
      }
      return names;
    }, [chats]);

    // Only the agent process itself is renamed: its children inherit the conversation environment and
    // keep their own operation names.
    const resolveLabel = useCallback(
      (process: Process.Info) => {
        if (!Process.isHarnessHost(process)) {
          return undefined;
        }
        const target = Annotation.getDictionary(process.params.annotations, Process.TargetAnnotation).pipe(
          Option.getOrUndefined,
        );
        return target === undefined ? undefined : chatNamesByFeed.get(feedKey(target.toString()));
      },
      [chatNamesByFeed],
    );

    const handleOpenLink = useCallback(
      (uri: string) => {
        const eid = EID.tryParse(uri);
        if (!eid || !EID.getSpaceId(eid) || !EID.getEntityId(eid)) {
          return;
        }

        void invokePromise(NavigationOperation.ResolveNavigationTargets, { query: { uri: eid } }).then(({ data }) => {
          const path = data?.targets[0]?.path;
          if (path) {
            void invokePromise(LayoutOperation.Open, { subject: [path] });
          }
        });
      },
      [invokePromise],
    );

    useTraceDumpHatch(space);

    return (
      <NaturalTracePanel
        {...composableProps(props, attentionAttrs)}
        ref={forwardedRef}
        processes={processes}
        graph={graph}
        environments={environments}
        onEnvironmentsChange={handleEnvironmentsChange}
        debug={settings.tracePanelDebug ?? false}
        resolveLabel={resolveLabel}
        selected={selectedPids}
        onSelectedChange={setSelected}
        onProcessTerminate={onProcessTerminate}
        onOpenLink={handleOpenLink}
      />
    );
  },
);

TracePanel.displayName = 'TracePanel';

// Stable ref.
const atomEmpty = Atom.make(() => [] as const);

/** Entity id of a feed URI, the join key between a process environment and a chat's feed ref. */
const feedKey = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

const useTraceDumpHatch: (space: TracePanelProps['space']) => void = import.meta.env.DEV
  ? (space) => {
      const traceMessages = useTraceMessages(space);
      useEffect(() => {
        const debugGlobal = globalThis as typeof globalThis & { dxosDumpTrace?: () => string };
        debugGlobal.dxosDumpTrace = () => {
          const data = traceMessages.map((message) => ({
            meta: message.meta,
            isEphemeral: message.isEphemeral,
            events: message.events,
          }));
          const json = JSON.stringify(data, null, 2);
          // eslint-disable-next-line no-console
          console.log(json);
          void navigator.clipboard?.writeText(json);
          return `dxosDumpTrace: ${data.length} message(s) copied to clipboard`;
        };

        return () => {
          delete debugGlobal.dxosDumpTrace;
        };
      }, [traceMessages]);
    }
  : () => {};
