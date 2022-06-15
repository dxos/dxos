# ECHO

<img src="../assets/diagrams/echo-architecture.drawio.png">

## Database

Root object for an ECHO database.

Hosts the set of items and links.
Allows users to perform queries using the selection API.
The access control and network features are delegated to the `Party` that holds this database.

## Party protocol

### Authenticator

Authenticates members before they can start replication.
Members must provide a valid credential before the are let into the party.
First-time members can attach a FeedAdmit message so their feeds can be included into the feed DAG.
