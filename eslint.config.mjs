// @ts-check

import eslint from '@eslint/js';
import sortImports from '@trivago/prettier-plugin-sort-imports';
import sortExports from 'eslint-plugin-sort-exports';
import reactPlugin from 'eslint-plugin-react';
import importX from 'eslint-plugin-import-x';
import arrowFunctions from 'eslint-plugin-prefer-arrow-functions';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import storybook from 'eslint-plugin-storybook';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

import dxos from '@dxos/eslint-plugin-rules';

const SOURCES_GLOB = '**/{src,config,.storybook}/**';

export default tseslint.config(
  //
  // Global ignores
  //
  {
    // WARNING: Do not add extra keys to this config object
    // See: https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
    ignores: [
      // Build Artifacts
      '**/dist',
      '**/out',
      '**/storybook-static',
      '**/gen/*',
      '**/__swc_snapshots__',
      'packages/core/protocols/proto/**/*',
      'packages/sdk/client/src/version.ts',
      'packages/sdk/client-services/src/version.ts',
      'packages/devtools/cli/src/version.ts',
      'packages/ui/react-ui-calendar/orig/**/*',

      // Config
      '**/eslint.config.mjs',
      '**/eslint.config.cjs',
      '**/.eslintrc.js',
      '**/.eslintrc.cjs',
      '**/playwright.config.ts',
      '**/vite.config.ts',
      '**/vitest.config.ts',
      '**/vitest.*.config.ts',
      '**/webpack.config.js',
      '**/tailwind.config.js',
      '**/postcss.config.cjs',
      '**/tailwind.ts',
      '**/esbuild-server.config.js',
      '**/.storybook/main.mts',
      '**/.storybook/preview.mts',

      // Dependencies
      'node_modules',
      '**/node_modules',

      // Docs snippets
      'docs/content/**/*',
      '**/typedoc/assets/**/*',

      // Deprecated
      'packages/plugins/plugin-assistant/deprecated',

      // Other
      '**/*.tpl',
      '**/bin',
      '**/scripts',
      '**/vendor',
      'packages/apps/composer-app/src/functions/_worker.ts',
      'packages/common/esbuild-plugins/polyfills',
      'packages/common/node-std',
      'packages/core/mesh/signal/testing/setup.js',
      'packages/core/mesh/network-manager/module-stub.mjs',
      'packages/sdk/config/src/testing',
      'packages/sdk/shell/react-i18next.d.ts',
      'packages/ui/react-ui-geo/data',
      'packages/ui/solid-ui-geo/data',
      'tools/dx-tools',
      'tools/esbuild/cli.js',
      'tools/storybook-react/.storybook/stub.mjs',
    ],
    // WARNING: Do not add extra keys to this config object
    // See: https://eslint.org/docs/latest/use/configure/configuration-files#globally-ignoring-files-with-ignores
  },

  //
  // Global options
  //
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importX,
      'prefer-arrow-functions': arrowFunctions,
      'sort-imports': sortImports,
      'sort-exports': sortExports,
      'unused-imports': unusedImports,
    },
  },

  //
  // All files
  //
  {
    files: [[SOURCES_GLOB, '**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}']],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactPlugin.configs.flat.recommended,
      prettierRecommended,
      dxos.configs.recommended,
    ],
    rules: {
      // TODO(burdon): Sort rules.
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/consistent-type-exports': 'off', // TODO(dmaretskyi): Seems broken?
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-extra-parens': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-extra-semi': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',

      // TODO(dmaretskyi): Review new rules:
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-for-in-array': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',

      // General
      camelcase: 'off',
      'jsx-quotes': ['error', 'prefer-single'],
      'no-unused-vars': 'off',
      'no-console': 'error',
      'no-constant-binary-expression': 'off',
      'no-unsafe-optional-chaining': 'off',
      'no-dupe-else-if': 'off',
      'no-empty': 'off',
      'prefer-arrow-functions/prefer-arrow-functions': [
        'error',
        {
          allowNamedFunctions: true,
        },
      ],
      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],
      'prettier/prettier': 'error',
      'require-yield': 'off',

      // React
      // https://github.com/jsx-eslint/eslint-plugin-react/tree/master/docs/rules
      'react/display-name': 'off',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react/jsx-first-prop-new-line': ['error', 'multiline-multiprop'],
      // 'react/jsx-sort-props': [
      //   'warn',
      //   {
      //     callbacksLast: true,
      //     noSortAlphabetically: true,
      //   },
      // ],
      'react/jsx-tag-spacing': [
        'error',
        {
          afterOpening: 'never',
          beforeClosing: 'never',
          beforeSelfClosing: 'always',
          closingSlash: 'never',
        },
      ],
      'react/jsx-wrap-multilines': 'off',
      'react/prop-types': 'off',

      // Imports
      'import-x/newline-after-import': [
        'error',
        {
          count: 1,
        },
      ],
      'import-x/order': [
        'error',
        {
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [
            {
              pattern: '#**',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '@dxos/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
        },
      ],
      'sort-imports': [
        'error',
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single'],
        },
      ],
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },

  //
  // SolidJS - Exclude React rules
  //
  {
    files: [
      'packages/devtools/cli/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/common/effect-atom-solid/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/common/web-context-solid/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/core/echo/echo-solid/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/plugins/plugin-map-solid/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/sdk/app-solid/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/ui/solid-ui*/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'tools/storybook-solid/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
    ],
    rules: {
      ...Object.fromEntries(
        Object.keys(reactPlugin.rules).map((rule) => [`react/${rule}`, 'off']),
      ),
    },
  },

  //
  // Tools
  //
  {
    files: [
      'packages/devtools/cli/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/devtools/cli-base/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/devtools/cli-composer/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'packages/common/log/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
      'tools/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}',
    ],
    rules: {
      'no-console': 'off',
    },
  },

  //
  // Tests
  //
  {
    files: [
      [SOURCES_GLOB, '**/*.{test,stories,blueprint-test}.{js,ts,jsx,tsx,mts,cts,mjs,cjs}'],
      [SOURCES_GLOB, '**/testing/**/*.{js,ts,jsx,tsx,mts,cts,mjs,cjs}'],
    ],
    rules: {
      'no-console': 'off',
    },
  },

  //
  // Storybook
  //
  {
    extends: [storybook.configs['flat/recommended']],
    files: [[SOURCES_GLOB, '**/*.stories.{tsx,jsx}']],
    rules: {
      'storybook/context-in-play-function': 'off',
    },
  },

  //
  // Explicit context propagation (ctx: Context as first param).
  // Applied broadly; public API classes and UI/plugin packages are exempt.
  //
  {
    files: [
      'packages/core/**/src/**/*.ts',
      'packages/sdk/**/src/**/*.ts',
    ],
    ignores: [
      '**/*.test.ts',
      '**/testing/**',
    ],
    rules: {
      'dxos-plugin/require-context-param': [
        'warn',
        {
          allowClasses: [
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

            // @dxos/context — Context itself.
            'Context',

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
            'SpacesServiceImpl',
            'InvitationsServiceImpl',
            'IdentityServiceImpl',
            'NetworkServiceImpl',
            'EdgeAgentServiceImpl',
            'DevicesServiceImpl',
            'ContactsServiceImpl',

            // @dxos/async — low-level primitives.
            'Event',
            'Trigger',
            'Mutex',
            'DeferredTask',
            'UpdateScheduler',
            'PushStream',
            'Callback',
            'MulticastObservable',
            'SubscriptionList',
            'Lock',
            'Latch',

            // @dxos/codec-protobuf — serialization.
            'Stream',

            // @dxos/log — logging.
            'LogConfig',

            // @dxos/keys — value types.
            'PublicKey',
            'SpaceId',

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

            // @dxos/echo-db — QueueImpl._query is bound to Database.QueryFn (external type).
            'QueueImpl',

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
          ],
          allowMethods: [
            'toJSON',
            'toString',
          ],
        },
      ],
    },
  },
);
