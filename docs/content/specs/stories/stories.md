# User stories

#### Contributing

This Markdown file was exported from the adjacent `stories.ooutline` file with Omni Outliner. When submitting a PR with changes to this document, please tag a reviewer to also make changes in the source document (e.g. @thure), at least until this document becomes available in the Composer app.

## User story tree

The ditto mark (〃) indicates the same value as _the parent item_ (rather than the previous item).

#### Columns: Stories, Scope, Release, Priority, Notes

- Users can easily navigate through and collaborate with others in the distributed web	Halo, in-app OS, Cardstack, Composer	v0, v1	*
	- Users can experience and affect entities in the distributed web using an identity they control	Halo	〃	0
		- Users can create an identity	〃	〃	0
		- Users can recover an identity	〃	〃	0
		- Users can use the same identity as they currently use on a different device	〃	〃	0
		- Users can remove an identity from a device	〃	〃	1
			- Users can remove the identity from the current device (locally)	〃	〃	1
			- Users can remove the identity from another device remotely	〃	〃	1
		- Users can control access to their identity’s profile to other identities (which may belong to users or apps)	〃	〃	1
			- Users can grant such access 	〃	〃	1
			- Users can revoke such access	〃	〃	1
				What does this mean if the other identity shares a space with the one revoking access?
		- Users can change the display name of their identity	〃	〃	0
	- Users can collaborate with other users in Spaces	in-app OS	〃	0
		- Users can create a Space	〃	〃	0
		- Users in a Space can invite other identities to join the Space	〃	〃	0
		- Users can join a space using an invitation	〃	〃	0
			- Users can accept an invitation by scanning a QR code	〃	〃	0
			- Users can accept an invitation by pasting a text code	〃	〃	0
			- Users not using an authenticated identity will have a chance to create, recover, or authenticate an identity (§1.1), then will be taken to the space ready to collaborate	〃	〃	0
		- Users can interact with data in the Space using apps	〃	〃	0
		- Users can see the identities that have access to a Space	〃	〃	0
			- Users can see the connection status of member identities (“online”, “offline”)	〃	〃	0
				What is the latency between online and offline?
What if an identity is online but hasn’t been active in some amount of time?
			- Users can set their identity’s status in a space	〃	〃	2
				Only within a Space, or globally?
How persistent is this status?
		- Users can leave a Space	〃	〃	0
			What does this mean for the data attributed to the user’s identity?
		- Users can see all the Spaces their identity has access to	〃	〃	0
	- Users can maintain collections of identities for convenience	Halo, in-app OS	〃	1–3
		- Users can maintain “Contacts”: a collection of other users’ identities	〃	〃	1
			- Users can add an identity to Contacts	〃	〃	1–2
				- Users can add an identity from a Space’s list of member identities	in-app OS	〃	2
				- Users can add an identity by scanning a QR code	in-app OS	〃	1
				- Users can add an identity by pasting a text code	〃	〃	1
			- Users can invite an identity from Contacts to a Space more easily than unknown identities	in-app OS	〃	2
			- Users can accept invitations from identities in Contacts more easily than from unknown identities	in-app OS	〃	2
			- Users can send and receive basic text messages to/from identities in Contacts	Halo? Its own app?	v1	3
		- Users can maintain “Apps”: a collection of the identities of apps the user trusts or prefers	Halo	〃	1
	- Users can collaborate on structures of text nodes	Cardstack	〃	0–2
		- Users can create text nodes	〃	〃	0
			- Users can create text nodes at the root	〃	〃	0
			- Users can create text nodes as children of another text node	〃	〃	0
		- Users can set the order of nodes	〃	〃	1(–2)
			- Users can set the root’s order of nodes	〃	〃	1? 2?
			- Users can set the order of child nodes under a parent node	〃	〃	1? 2?
		- Users can delete text nodes	〃	〃	0–1
			- Users can delete text nodes with no children	〃	〃	0
			- Users can delete text nodes with children	〃	〃	1
				How would this work?
		- Users can add primary text to text nodes (‘titles’)	〃	〃	0
		- Users can add secondary text to text nodes (‘descriptions’)	〃	〃	1
		- Users can associate an arbitrary string-string record with a text node (‘columns’)	〃	〃	2
		- Users can use the “state” column to view and interact with the nodes in a kanban board 	〃	〃	1–2
			- Users can change the order of the columns	〃	〃	2
			- Users can create new columns (‘state values’)	〃	〃	1
	- Users can collaborate on text-oriented documents	Composer	〃	0
		- Users can make changes nondestructively alongside other users making changes	〃	〃	0
- Developers can easily create new experiences for the distributed web using DXOS SDKs and documentation	DXOS repo & docs.dxos.org <http://docs.dxos.org>	v0	*
