# Client API Clean-up

- createProfile => createIdentity (also recoverProfile)
- services.ProfileService (and protos)
- get vs queries (and ResultSet)
- open/close (async) vs. initialize/destroy
- deprecated getters (e.g., EchoProxy.networkManager)
- space get/set title vs. properties

- review waitForCondition

- logging
- inspect/toJSON
- events (public)

