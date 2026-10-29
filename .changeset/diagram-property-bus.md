---
'@dxos/diagram': minor
---

The semantic diagram engine bundles edges that carry one property: edges out of one node with the same label (and style) share one port and one trunk that fans out to each target, and edges into one node with the same label gather the same way, with the label drawn once on the trunk. It is the drawing `edge A -> B, C bus` makes, without writing `bus`. Unlabelled edges and edges with different labels are routed as before. Every bus, implicit or written with `bus`, now places its hub upstream of its targets and drops its trunk straight from the hub toward them. A trunk's targets sit side by side, with a target that leads on to other nodes at the end, and when two trunks feed the same targets, one whose hub nothing else feeds is mirrored onto the far side.
