import React from 'react';
import { createRoot } from 'react-dom/client';
import { ContactsEmbed } from './tutorial/app/ContactsEmbed.tsx';
createRoot(document.getElementById('root')!).render(<ContactsEmbed stage='complete' peers={1} />);
