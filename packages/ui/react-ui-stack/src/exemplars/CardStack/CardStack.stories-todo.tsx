//
// Copyright 2025 DXOS.org
//

// type CardData = {
//   id: string;
//   title: string;
//   body: string;
//   image?: string;
// };

// const DraggableCard: FC<{ data: CardData; onDelete: (id: string) => void }> = ({ data, onDelete }) => {
//   const { id, title, body, image } = data;
//   const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
//   const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;
//
//   return (
//     <Card.Root ref={setNodeRef} item={data} style={{ transform: CSS.Transform.toString(t) }}>
//       <Card.Heading>
//         <Card.DragHandle {...listeners} {...attributes} />
//         <Card.Title title={title} />
//         <DropdownMenu.Root>
//           <DropdownMenu.Trigger asChild>
//             <Card.Menu />
//           </DropdownMenu.Trigger>
//           <DropdownMenu.Content>
//             <DropdownMenu.Viewport>
//               <DropdownMenu.Item onClick={() => onDelete(id)}>Delete</DropdownMenu.Item>
//             </DropdownMenu.Viewport>
//           </DropdownMenu.Content>
//         </DropdownMenu.Root>
//       </Card.Heading>
//       <Card.Content classNames={'text-sm'} gutter>
//         <p>{body}</p>
//       </Card.Content>
//       {image && <Card.Media src={image} classNames={'h-[160px]'} />}
//     </Card.Root>
//   );
// };
//
// const DraggableStory: FC<PropsWithChildren> = ({ children }) => {
//   const [cards, setCards] = useState<CardData[]>(
//     Array.from({ length: 7 }).map(() => ({
//       id: faker.string.uuid(),
//       title: faker.lorem.sentence(3),
//       body: faker.lorem.sentences(),
//       image: faker.datatype.boolean() ? faker.helpers.arrayElement(testImages) : undefined,
//     })),
//   );
//
//   const handleDelete = (id: string) => {
//     setCards((cards) => cards.filter((card) => card.id !== id));
//   };
//
//   const handleDragEnd = (event: DragEndEvent) => {
//     const { active, over } = event;
//     if (active.id !== over?.id) {
//       setCards((cards) => {
//         const oldIndex = cards.findIndex((card) => card.id === active.id);
//         const newIndex = cards.findIndex((card) => card.id === over?.id);
//         return arrayMove(cards, oldIndex, newIndex);
//       });
//     }
//   };
//
//   return (
//     <DndContext onDragEnd={handleDragEnd}>
//       <SortableContext items={cards.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
//         <div className='flex flex-col overflow-y-scroll'>
//           <div className='flex flex-col gap-4'>
//             {cards.map((card) => (
//               <DraggableCard key={card.id} data={card} onDelete={handleDelete} />
//             ))}
//           </div>
//         </div>
//       </SortableContext>
//     </DndContext>
//   );
// };
// export const Draggable = () => <DraggableStory />;
