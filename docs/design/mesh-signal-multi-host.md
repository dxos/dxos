# MESH signal: multi-host architecture

Please see the [MESH spec](mesh-spec.md) for background.

## Design principles

Kube are peers in a signaling network, and discover each other through libp2p's DHT, possibly bootstrapped only with other peers.

They rendez-vous on a particular CID on the DHT, allowing for separate signaling networks on the same DHT.

The rest of exchanges happen over Pub/Sub.

Events for a swarm are propagated in a corresponding topic. 

However, when a swarm is queried, responses are sent back through the querying kube's topic to limit communication overhead.

Note that with this design, all messages need not be, but can be seen by all members of the DHT.

## kube state

Each kube maintains:
- a subscription to their own topic;
- per local participant, a list of their subscriptions for messags and swarm memberships;
- per swarm with local participants (with a timeout after disconnects so participants can reconnect smoothly),
  a subscription to the swarm and list of known participants.

## A P2P connection: sequence diagram

This omits STUN/TURN to focus on communications between peers, their signaling services, and the signaling network.

![Diagram of a P2P connection](diagrams/puml/mesh-signal-multi-host-join.svg)

1. *Prelude: Bob joins.* Bob is already listening for their messages, and has joined `s0`.

2. *Alice's arrival.* Upon arrival, Alice subscribes to receive her messages. She joins `s0`.
   This causes the kube to look up peers, and Bob's kube announces Bob, which gets back to Alice.
   This also causes the kube to announce her, which gets back to Bob.

3. *Messaging.* As Alice initiates a connection with Bob, she sends a message to him.
   Further messages might be exchanged between Alice and Bob through their respective kubes and topics.

4. *Alice's departure.*
   Later, Alice leaves the swarm.
   This leads her kube to announce her departure,
   letting Bob's kube refresh its swarm membership table such that future joiners do not discover her immediately.
   Because Alice was the last active member of `s0` on her kube, it unsubscribes from `s0`.
   Because it no longer needs to receive lookup responses, it unsubscribes from `akube`.

5. *Bob's departure.*
   Eventually, Bob gets disconnected from their kube. After a timeout, Bob's kube proceeds as Alice's did.
