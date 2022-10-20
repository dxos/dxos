# DXOS Demo
> `packages/experimental/composer`

We need an application we can use to demonstrate how quick and easy it is to assemble a real-time collaborative text-editor between two browser windows using a yjs compatible text editor and ECHO.

We also demonstrate the multi-model nature of ECHO by showing an ObjectModel with a TextModel working under a single interface together.

## Who its for
`Developers` who build things classified as any of: web, frontend, web3, dApp.

Us (`we`) (DXOS) who will record a demo video with it and point others to it.

`users` are fictitious personages who use the `composer` app to edit a text together

## User stories
`Developers` can:
- instantiate the demo using `dx app new mydemo --template demo`
- observe how to instantiate echo
- observe how to instantiate basic ui components in react

`we` can:
- show how the code is trivial and consists of two or three key snippets of code

for basic features, `users` can:
- see plain text document and edit it
- invite someone to join the space via receiving a URL
- accept an invitation from someone via pasting a URL
- collaborate on any part of the document together without locking (seeing own cursor only)
- go offline and return online later with expectable results

for polish features, `users` can:
- see colored cursors from everyone in the space
- see a rich text document and edit it incl. md formatting

for more features showing object model, `users` can:
- see a list of documents in a side-panel next to the editor
- create / delete / rename documents in the list collaboratively
- navigate the list of documents by clicking on each item to see it in the editor
- re-order items in the list by dragging and dropping