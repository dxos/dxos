# Interface `Client`
> Declared in [`core/protocols/dist/esm/src/proto/gen/dxos/config.d.ts`]()

Defined in:
   file://./../../dxos/config.proto
## Properties
### [devtoolsProxy]()
Type: <code>string</code>

Connect to and serve client services to a remote proxy.

Options:
  - proto3_optional = true

### [enableSnapshots]()
Type: <code>boolean</code>

Options:
  - proto3_optional = true

### [invitationExpiration]()
Type: <code>number</code>

Milliseconds

Options:
  - proto3_optional = true

### [lazySpaceOpen]()
Type: <code>boolean</code>

Spaces will stay in SpaceState.SPACE_CLOSED until explicitly opened. Speeds up client-services initialization.

Options:
  - proto3_optional = true

### [log]()
Type: <code>[Log](/api/@dxos/config/interfaces/Log)</code>

Options:
  - proto3_optional = true

### [remoteSource]()
Type: <code>string</code>

Options:
  - proto3_optional = true

### [remoteSourceAuthenticationToken]()
Type: <code>string</code>

Options:
  - proto3_optional = true

### [snapshotInterval]()
Type: <code>number</code>

Milliseconds

Options:
  - proto3_optional = true

### [storage]()
Type: <code>[Storage](/api/@dxos/config/interfaces/Storage)</code>

Options:
  - proto3_optional = true

