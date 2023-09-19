# Interface `EpochMontior`
> Declared in [`packages/core/protocols/dist/esm/src/proto/gen/dxos/config.d.ts`]()

Automatic epoch creation.

Defined in:
   file://./../../dxos/config.proto
## Properties
### [enabled]()
Type: <code>boolean</code>

Options:
  - proto3_optional = true

### [maxInactivityDelay]()
Type: <code>number</code>

Maximum amount of time (in milliseconds) to wait for an inactivity period before triggering a new epoch.

Options:
  - proto3_optional = true

### [minInactivityBeforeEpoch]()
Type: <code>number</code>

Amount of time (in milliseconds) required to pass since last mutation to trigger a new epoch.

Options:
  - proto3_optional = true

### [minMessagesBetweenEpochs]()
Type: <code>number</code>

Number of mutations required since last epoch to trigger a new epoch.

Options:
  - proto3_optional = true

### [minTimeBetweenEpochs]()
Type: <code>number</code>

Amount of time (in milliseconds) required to pass since last epoch to trigger a new epoch.

Options:
  - proto3_optional = true

    