# Daily Summary Timer Trigger

The Daily Summary plugin exposes a `GenerateSummary` operation via its blueprint.
To schedule automatic daily summaries, create a timer trigger in the space:

```
Trigger: {
  function: <ref to GenerateSummary operation>,
  enabled: true,
  spec: {
    kind: 'timer',
    cron: '0 21 * * *'  // 9 PM daily
  }
}
```

The cron expression can be customized. The plugin settings allow configuring the
preferred summary hour, which should be reflected in the trigger cron.
