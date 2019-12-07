# ECHO DB

Eventually Consistent Hierarchical Objects Database.


## Background

Applications consist of frontend components (Pads) and backend services (Bots), which interact as peers on the network.
Peers exchange data by replicating feeds within a shared security domain called a Party.
Each peer writes mutations as messages to an append-only log.
The logs from each peer are combined into sets of logically partitioned datasets, 
which are manipulated by application-specific state machines.


## Consistency

Messages are received in order from individual peers, but peers may be randomly connected to each other.
Therefore, at any moment each peer may have different sets of data from each other.
In order to maintain consistency, applications implement state machines that generate a consistent data model.
These state machines may be different for each application.
Some application may be made up from a composite of multiple state machines.
