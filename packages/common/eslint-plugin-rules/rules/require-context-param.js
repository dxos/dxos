//
// Copyright 2026 DXOS.org
//

/**
 * ESLint rule enforcing `ctx: Context` as the first parameter on class methods.
 * Classes and methods listed below are exempt (public APIs, fixed external interfaces, etc.).
 */

'use strict';

/**
 * Classes exempt from the require-context-param rule.
 * Grouped by package for maintainability.
 */
const DEFAULT_ALLOW_CLASSES = [
  // @dxos/client — public API.
  'Client',
  'LocalClientServices',
  'WorkerClientServices',
  'AgentClientServiceProvider',
  'DedicatedWorkerClientServices',
  'ClientServicesProxy',
  'Shell',
  'ShellManager',
  'IFrameManager',
  'SharedWorkerConnection',
  'AgentManagerClient',
  'InvitationsProxy',

  // @dxos/echo — public API.
  'Filter',
  'FilterClass',
  'Query',
  'QueryClass',

  // Proxy classes (implement public Space/Echo/Halo interfaces).
  'SpaceProxy',
  'SpaceList',
  'HaloProxy',
  'MeshProxy',

  // @dxos/client-protocol — public API.
  'CancellableInvitation',
  'AuthenticatingInvitation',
  'InvitationEncoder',

  // Classes implementing fixed external interfaces (WireProtocol, NetworkAdapter, Protobuf services, etc.).
  'SpaceProtocolSession',
  'DataServiceImpl',
  'QueryServiceImpl',
  'LocalQueueServiceImpl',
  'QueueServiceStub',
  'SpacesServiceImpl',
  'IdentityServiceImpl',
  'InvitationsServiceImpl',
  'DevicesServiceImpl',
  'NetworkServiceImpl',

  // Teleport extensions (implement fixed Teleport handler interfaces).
  'CredentialRetrieverExtension',
  'CredentialServerExtension',
  'AuthExtension',
  'NotarizationPlugin',
  'NotarizationTeleportExtension',
  'InvitationHostExtension',
  'InvitationGuestExtension',
  'InvitationTopology',

  // Proto-generated service implementations (method signatures fixed by proto definition).
  'DevtoolsServiceImpl',
  'SystemServiceImpl',
  'LoggingServiceImpl',
  'EdgeAgentServiceImpl',
  'ContactsServiceImpl',

  // @dxos/echo-db — Proxy handler (implements ProxyHandler with fixed trap signatures).
  'EchoReactiveHandler',

  // @dxos/echo-db — public Database API implementation.
  'EchoDatabaseImpl',

  // @dxos/echo-db — implements Hypergraph interface from @dxos/echo.
  'HypergraphImpl',

  // @dxos/echo-db — implements SchemaRegistry interface from @dxos/echo.
  'RuntimeSchemaRegistry',
  'DatabaseSchemaRegistry',

  // @dxos/echo-db — implements QueryResult interface from @dxos/echo.
  'SchemaRegistryPreparedQueryImpl',
  'QueryResultImpl',

  // @dxos/echo-db — implements external service interface.
  'QueueServiceImpl',
  'MockQueueService',

  // @dxos/echo-db — public Queue API implementations (Queue interface is public API; no ctx on public methods).
  'QueueImpl',
  'MemoryQueue',
  'QueueFactory',

  // Automerge NetworkAdapter (external interface with fixed signatures).
  'EchoNetworkAdapter',

  // Infrastructure / storage (no tracing).
  'MetadataStore',
  'LevelDBStorageAdapter',
  'HeadsStore',
  'EchoDataMonitor',

  // @dxos/credentials — CredentialProcessor interface (fixed signature).
  'AutomergeSpaceState',
  'DefaultSpaceStateMachine',

  // @dxos/client-services — utility / internal.
  'WebLockWrapper',

  // @dxos/network-manager — fast-check AsyncCommand implementations (external library interface).
  'CreatePeerCommand',
  'RemovePeerCommand',
  'JoinTopicCommand',
  'LeaveTopicCommand',

  // @dxos/network-manager — Transport interface implementations (fixed open/close/onSignal/getDetails/getStats signatures).
  'MemoryTransport',
  'TcpTransport',
  'RtcTransportChannel',
  'RtcTransportProxy',

  // @dxos/network-manager — Topology interface implementations (fixed init/update/onOffer/destroy signatures).
  'FullyConnectedTopology',
  'MMSTTopology',
  'StarTopology',

  // @dxos/network-manager — TransportFactory interface (fixed createTransport signature).
  'RtcTransportProxyFactory',

  // @dxos/network-manager — RtcConnectionFactory interface implementations.
  'BrowserRtcConnectionFactory',
  'NodeRtcConnectionFactory',

  // @dxos/network-manager — BridgeService proto-generated interface implementation.
  'RtcTransportService',

  // @dxos/network-manager — SignalMessenger interface implementation.
  'SwarmMessenger',

  // @dxos/messaging — SignalManager interface implementations (fixed join/leave/open/close signatures).
  'WebsocketSignalManager',
  'EdgeSignalManager',
  'MemorySignalManager',

  // @dxos/messaging — SignalClientMethods interface implementation.
  'SignalClient',

  // @dxos/edge-client — EdgeConnection interface implementation (extends Resource with fixed lifecycle).
  'EdgeClient',

  // @dxos/edge-client — HTTP client utility (many callers across codebase, adding ctx would cascade widely).
  'EdgeHttpClient',

  // @dxos/edge-client — Resource subclass (_open/_close override signatures fixed by base class).
  'EdgeWsConnection',

  // @dxos/edge-client — Protocol codec utility (pure serialization, no side effects).
  'Protocol',

  // @dxos/teleport — core infrastructure classes (widely used lifecycle/stream APIs across packages).
  'Teleport',
  'Muxer',
  'Balancer',
  'Framer',

  // @dxos/rpc — fundamental RPC infrastructure (open/close/call used by every RPC consumer).
  'RpcPeer',
  'ProtoRpcPeer',

  // @dxos/websocket-rpc — RPC over websocket (lifecycle methods used across packages).
  'WebsocketRpcClient',
  'WebsocketRpcServer',

  // @dxos/signal — test signal server runner (test infrastructure utility).
  'SignalServerRunner',

  // @dxos/rpc-tunnel — port multiplexing utility (used across packages).
  'PortMuxer',

  // @dxos/teleport-extension-gossip — Resource subclass (_open/_catch overrides fixed by Resource base class).
  'Presence',

  // @dxos/teleport-extension-gossip — test utility.
  'TestAgent',

  // @dxos/teleport-extension-gossip — internal gossip manager (callers in allowClasses lack ctx).
  'Gossip',

  // @dxos/teleport-extension-object-sync — blob storage/sync (@synchronized methods, callers in allowClasses).
  'BlobStore',
  'BlobSync',

  // @dxos/teleport — TeleportExtension interface implementations (fixed onOpen/onClose/onAbort signatures).
  'ControlExtension',
  'RpcExtension',
  'GossipExtension',
  'BlobSyncExtension',
  'ReplicatorExtension',
  'AutomergeReplicator',

  // @dxos/client — public/test API, coordinator interface.
  'FakeAgentHostingProvider',
  'SingleClientCoordinator',
  'SharedWorkerCoordinator',
  'MemoryWorkerCoordiantor',

  // @dxos/app-framework — plugin infrastructure (implements Plugin/capability interfaces).
  'CapabilityManagerImpl',
  'ManagerImpl',
  'PluginBuilderImpl',

  // @dxos/app-graph — graph builder/implementation (implements Graph interfaces).
  'GraphBuilderImpl',
  'GraphImpl',

  // @dxos/config — configuration utility/public API.
  'Config',

  // @dxos/examples — Playwright test utility.
  'AppManager',

  // @dxos/migrations — migration utility/public API.
  'MigrationBuilder',

  // @dxos/observability — tracing/observability infrastructure.
  'OtelLogs',
  'OtelMetrics',
  'TagInjectorSpanProcessor',
  'OtelTraces',
  'LogBuffer',
  'ObservabilityImpl',

  // @dxos/react-client — React hooks/providers.
  'KeyStore',

  // @dxos/schema — schema-related utility/public API.
  'SpaceGraphModel',
  'ProjectionModel',

  // @dxos/shell — shell runtime (implements ShellRuntime interface).
  'MemoryShellRuntime',
  'ShellRuntimeImpl',

  // @dxos/credentials — CredentialProcessor interface implementations.
  'DeviceStateMachine',
  'ProfileStateMachine',

  // @dxos/credentials — SpaceState interface implementation.
  'SpaceStateMachine',

  // @dxos/credentials — CredentialGraphStateHandler interface implementation.
  'MemberStateMachine',

  // @dxos/credentials — internal graph / state machines (callers in allowClasses lack ctx).
  'CredentialGraph',
  'FeedStateMachine',
  'InvitationStateMachine',
  'CredentialConsumer',
  'CredentialGenerator',

  // @dxos/keyring — implements Signer interface from @dxos/crypto.
  'Keyring',

  // @dxos/echo — ProxyHandler / ReactiveHandler interface implementations (fixed trap signatures).
  'ProxyHandlerSlot',
  'TypedReactiveHandler',

  // @dxos/echo — Ref / RefResolver interface implementations.
  'RefImpl',
  'StaticRefResolver',

  // @dxos/echo — public API (BaseSchema interface).
  'EchoSchema',

  // @dxos/echo-query — stateless parser (pure computation, no side effects).
  'QueryBuilder',

  // @dxos/echo-query — Resource subclass (eval is pure computation).
  'QuerySandbox',

  // @dxos/index-core — Effect-based engine / indexes (thin delegation, Effect patterns).
  'IndexEngine',
  'FtsIndex',

  // @dxos/echo-generator — testing utilities.
  'TestObjectGenerator',
  'SpaceObjectGenerator',

  // @dxos/feed — Effect-based sync protocol.
  'SyncClient',
  'SyncServer',

  // @dxos/echo-protocol — deprecated value type.
  'Reference',

  // @dxos/ai — mock model registry (testing utility).
  'MockModelRegistry',

  // @dxos/assistant — execution graph visualization utility.
  'ExecutionGraph',

  // @dxos/compute — Resource subclasses (HyperFormula compute graph runtime).
  'ComputeGraphRegistry',
  'ComputeGraph',
  'ComputeNode',

  // @dxos/functions-runtime-cloudflare — Resource subclass / queue API implementation.
  'FunctionsClient',
  'QueuesAPIImpl',

  // @dxos/functions-runtime — tracing utility.
  'PrettyConsoleTracer',

  // @dxos/conductor — extends AbstractGraphModel / AbstractBuilder (method signatures fixed by base class).
  'ComputeGraphModel',
  'ComputeGraphBuilder',

  // @dxos/conductor — implements SequenceLogger interface.
  'SequenceLoggerAdapter',

  // @dxos/conductor — Effect-based compute pipeline (methods return Effect.Effect; Effect handles context propagation).
  'GraphExecutor',
  'Workflow',
  'WorkflowLoader',

  // @dxos/conductor — private namespace builder/parser classes (builder pattern).
  'Builder',
  'Parser',

  // @dxos/conductor — testing utility (also excluded by **/testing/** ignore).
  'TestRuntime',

  // @dxos/assistant — Resource subclass (context binding manager, conversation manager).
  'AiContextBinder',
  'AiConversation',

  // @dxos/compute — HyperFormula plugin framework (method names mapped via implementedFunctions).
  'FunctionContext',
  'AsyncFunctionPlugin',
  'EdgeFunctionPlugin',
  'TestPlugin',
  'TestBuilder',

  // @dxos/functions-runtime — HTTP client wrapper / @deprecated service container.
  'FunctionsServiceClient',
  'FunctionExecutor',
  'ServiceContainer',

  // @dxos/functions — implements CredentialsService tag interface.
  'ConfiguredCredentialsService',

  // @dxos/ai — stateless parser/decoder/logging utilities (pure data transformation, no async lifecycle).
  'StreamTransform',
  'ConsolePrinter',
  'SSEDecoder',
  'LineDecoder',

  // @dxos/operation — Effect-based invoker/scheduler (flagged methods are private).
  'OperationInvokerImpl',
  'FollowupSchedulerImpl',

  // @dxos/blueprints — read-only collection.
  'Registry',

  // @dxos/assistant-toolkit — markdown data-transformation utility.
  'MarkdownTasks',

  // @dxos/functions-simulator-cloudflare — Resource subclass (test worker).
  'FunctionWorker',
];

/** Methods exempt from the require-context-param rule in any class. */
const DEFAULT_ALLOW_METHODS = [
  'toJSON',
  'toString',
];

const firstParamIsContext = (params) => {
  if (params.length === 0) {
    return false;
  }
  const firstParam = params[0];
  const annotation = firstParam.typeAnnotation?.typeAnnotation;
  if (!annotation) {
    return false;
  }
  if (annotation.type === 'TSTypeReference' && annotation.typeName?.type === 'Identifier') {
    return annotation.typeName.name === 'Context';
  }
  return false;
};

const getClassName = (node) => {
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') {
      return parent.id?.name ?? null;
    }
    parent = parent.parent;
  }
  return null;
};

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require ctx: Context as first parameter on class methods.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowClasses: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional class names to exempt (merged with built-in defaults).',
          },
          allowMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional method names to exempt (merged with built-in defaults).',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingContext:
        'Method "{{ className }}.{{ methodName }}" must have `ctx: Context` as its first parameter.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const allowClasses = new Set([...DEFAULT_ALLOW_CLASSES, ...(options.allowClasses || [])]);
    const allowMethods = new Set([...DEFAULT_ALLOW_METHODS, ...(options.allowMethods || [])]);

    return {
      MethodDefinition(node) {
        if (node.kind === 'constructor' || node.kind === 'get' || node.kind === 'set') {
          return;
        }

        if (node.static) {
          return;
        }

        const methodName = node.key.type === 'Identifier' ? node.key.name : null;
        if (!methodName) {
          return;
        }

        if (allowMethods.has(methodName)) {
          return;
        }

        const className = getClassName(node);
        if (className && allowClasses.has(className)) {
          return;
        }

        const params = node.value.params || [];
        if (!firstParamIsContext(params)) {
          context.report({
            node: node.key,
            messageId: 'missingContext',
            data: {
              className: className || '<anonymous>',
              methodName,
            },
          });
        }
      },
    };
  },
};
