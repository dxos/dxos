# Tutorial

## Lamport Clock

A [Lamport Timestamp](https://en.wikipedia.org/wiki/Lamport_timestamps) 
is a simple algorithm used to determine the order of events in a decentralized system.
It is a simple form of the more general concept of a [Vector Clock](https://en.wikipedia.org/wiki/Vector_clock).

The following illustrates the operation of a simple lamport timestamp.

![Lamport Clock](./images/lamport.gif)

The squares represent messages on three different feeds (blue, green, and orange).
Each message is writen in sequence to their respective feed, and includes the identifier
of a previous message, which creates a dependency.
The CRDT algorithm generates a [partially ordered set](https://en.wikipedia.org/wiki/Partially_ordered_set)
and messages are applied to that state machine in this order.
