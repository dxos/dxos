//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { KeyboardEvent, useEffect, useRef, useState } from 'react';

import { faker } from '@dxos/random';
import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { useSearchListInput, useSearchListItem, useSearchListResults } from './hooks';
import { SearchList } from './SearchList';

faker.seed(1234);

type StoryItem = {
  id: string;
  label: string;
  icon?: string;
};

const defaultItems: StoryItem[] = faker.helpers.uniqueArray(faker.commerce.productName, 16).map((label) => ({
  id: faker.string.uuid(),
  label,
  icon: 'ph--file--regular',
}));

//
// Default Story - Basic composition with SearchList.Item
//

type DefaultStoryProps = {
  items?: StoryItem[];
};

const DefaultStory = ({ items = defaultItems }: DefaultStoryProps) => {
  const { results, handleSearch } = useSearchListResults({ items });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Search items...' autoFocus />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            <SearchList.Viewport>
              {results.length > 0 ? (
                results.map((item) => (
                  <SearchList.Item
                    key={item.id}
                    value={item.id}
                    label={item.label}
                    icon={item.icon}
                    onSelect={() => console.log('[SearchList.Item.onSelect]', item.id, item.label)}
                  />
                ))
              ) : (
                <SearchList.Empty />
              )}
            </SearchList.Viewport>
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// Controlled Story - Controlled query state
//

const ControlledStory = ({ items = defaultItems }: DefaultStoryProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StoryItem[]>(items);

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery) {
      setResults(items);
      return;
    }
    const filtered = items.filter((item) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));
    setResults(filtered);
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    handleSearch(newQuery);
  };

  return (
    <SearchList.Root onSearch={handleSearch} value={query}>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <SearchList.Input placeholder='Controlled search...' onChange={(e) => handleQueryChange(e.target.value)} />
            <Toolbar.Button onClick={() => handleQueryChange('')}>Clear Query</Toolbar.Button>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <SearchList.Content>
            <SearchList.Viewport>
              {results.map((item) => (
                <SearchList.Item
                  key={item.id}
                  value={item.id}
                  label={item.label}
                  icon={item.icon}
                  onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Content>
        </Panel.Content>
        <Panel.Statusbar>
          <div className='flex p-2 items-center text-sm text-description'>Controlled query: &quot;{query}&quot;</div>
        </Panel.Statusbar>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// Custom Rendering Story - Custom components in Content using useSearchItem hook
//

type CustomItemProps = {
  value: string;
  label: string;
  description: string;
  onSelect?: () => void;
};

const CustomItem = ({ value, label, description, onSelect }: CustomItemProps) => {
  const { selectedValue, registerItem, unregisterItem } = useSearchListItem();
  const ref = useRef<HTMLDivElement>(null);
  const isSelected = selectedValue === value;

  useEffect(() => {
    registerItem(value, ref.current, onSelect);
    return () => unregisterItem(value);
  }, [value, onSelect, registerItem, unregisterItem]);

  // Scroll into view when selected.
  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isSelected]);

  return (
    <div
      ref={ref}
      role='option'
      aria-selected={isSelected}
      data-selected={isSelected}
      className={`p-2 border-b border-separator cursor-pointer ${isSelected ? 'bg-hover-overlay' : 'hover:bg-hover-overlay'}`}
      onClick={onSelect}
    >
      <div className='font-medium'>{label}</div>
      <div className='text-xs text-description'>{description}</div>
    </div>
  );
};

const CustomRenderingStory = ({ items = defaultItems }: DefaultStoryProps) => {
  const { results, handleSearch } = useSearchListResults({ items });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Search with custom rendering...' autoFocus />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            <SearchList.Viewport>
              {results.map((item) => (
                <CustomItem
                  key={item.id}
                  value={item.id}
                  label={item.label}
                  description={`ID: ${item.id}`}
                  onSelect={() => console.log('[CustomItem.onSelect]', item.id, item.label)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// With Empty Story - Show Empty component when no results
//

const WithEmptyStory = () => {
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (query: string) => {
    setHasSearched(!!query);
  };

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Try searching for anything...' />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            <SearchList.Empty />
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// Without Viewport Story - Content without scrolling
//

const WithoutViewportStory = ({ items = defaultItems }: DefaultStoryProps) => {
  const { results, handleSearch } = useSearchListResults({ items });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Search without viewport (no scroll)...' />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            {results.map((item) => (
              <SearchList.Item
                key={item.id}
                value={item.id}
                label={item.label}
                icon={item.icon}
                onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}
              />
            ))}
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// With Icons Story - Various icon configurations
//

const iconsItems: StoryItem[] = [
  { id: '1', label: 'Document', icon: 'ph--file-text--regular' },
  { id: '2', label: 'Folder', icon: 'ph--folder--regular' },
  { id: '3', label: 'Image', icon: 'ph--image--regular' },
  { id: '4', label: 'Settings', icon: 'ph--gear--regular' },
  { id: '5', label: 'No icon item' },
];

const WithIconsStory = () => {
  return (
    <SearchList.Root>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Search items with icons...' />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            {iconsItems.map((item) => (
              <SearchList.Item
                key={item.id}
                value={item.id}
                label={item.label}
                icon={item.icon}
                onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}
              />
            ))}
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// Custom Input Story - Demonstrate using hooks for custom input
//

const CustomInput = () => {
  const { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect } =
    useSearchListInput();

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const values = getItemValues();
    if (values.length === 0) {
      if (event.key === 'Escape') {
        onQueryChange('');
      }
      return;
    }

    const currentIndex = selectedValue !== undefined ? values.indexOf(selectedValue) : -1;

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, values.length - 1);
        const nextValue = values[nextIndex];
        if (nextValue !== undefined) {
          onSelectedValueChange(nextValue);
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        const prevIndex = currentIndex === -1 ? values.length - 1 : Math.max(currentIndex - 1, 0);
        const prevValue = values[prevIndex];
        if (prevValue !== undefined) {
          onSelectedValueChange(prevValue);
        }
        break;
      }
      case 'Enter': {
        if (selectedValue !== undefined) {
          event.preventDefault();
          triggerSelect();
        }
        break;
      }
      case 'Escape': {
        event.preventDefault();
        if (selectedValue !== undefined) {
          onSelectedValueChange(undefined);
        } else {
          onQueryChange('');
        }
        break;
      }
    }
  };

  return (
    <Toolbar.Root>
      <Input.Root>
        <Input.TextInput
          type='text'
          value={query}
          placeholder='Custom input...'
          onChange={(ev) => onQueryChange(ev.target.value)}
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
      {query && <Toolbar.IconButton icon='ph--x--regular' iconOnly label='Clear' onClick={() => onQueryChange('')} />}
    </Toolbar.Root>
  );
};

const CustomInputStory = ({ items = defaultItems }: DefaultStoryProps) => {
  const { results, handleSearch } = useSearchListResults({ items });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Toolbar>
          <CustomInput />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            <SearchList.Viewport>
              {results.map((item) => (
                <SearchList.Item
                  key={item.id}
                  value={item.id}
                  label={item.label}
                  icon={item.icon}
                  onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}
                />
              ))}
            </SearchList.Viewport>
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// With Disabled Items Story
//

const disabledItems: StoryItem[] = [
  { id: '1', label: 'Available item 1', icon: 'ph--check--regular' },
  { id: '2', label: 'Disabled item (cannot select)', icon: 'ph--prohibit--regular' },
  { id: '3', label: 'Available item 2', icon: 'ph--check--regular' },
  { id: '4', label: 'Disabled item 2', icon: 'ph--prohibit--regular' },
  { id: '5', label: 'Available item 3', icon: 'ph--check--regular' },
];

const WithDisabledItemsStory = () => {
  return (
    <SearchList.Root>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Arrow keys skip disabled items...' autoFocus />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            {disabledItems.map((item, index) => (
              <SearchList.Item
                key={item.id}
                value={item.id}
                label={item.label}
                icon={item.icon}
                disabled={index === 1 || index === 3}
                onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}
              />
            ))}
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// With Groups Story
//

type GroupedItem = StoryItem & { category: string };

const groupedItems: GroupedItem[] = [
  { id: '1', label: 'Document 1', icon: 'ph--file-text--regular', category: 'Documents' },
  { id: '2', label: 'Document 2', icon: 'ph--file-text--regular', category: 'Documents' },
  { id: '3', label: 'Image 1', icon: 'ph--image--regular', category: 'Images' },
  { id: '4', label: 'Image 2', icon: 'ph--image--regular', category: 'Images' },
  { id: '5', label: 'Settings', icon: 'ph--gear--regular', category: 'Other' },
];

const WithGroupsStory = () => {
  const { results, handleSearch } = useSearchListResults({ items: groupedItems });

  // Group items by category.
  const grouped = results.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, GroupedItem[]>,
  );

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Panel.Root>
        <Panel.Toolbar>
          <SearchList.Input placeholder='Search grouped items...' autoFocus />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <SearchList.Content>
            <SearchList.Viewport>
              {Object.entries(grouped).map(([category, items]) => (
                <SearchList.Group key={category} heading={category}>
                  {items.map((item) => (
                    <SearchList.Item
                      key={item.id}
                      value={item.id}
                      label={item.label}
                      icon={item.icon}
                      onSelect={() => console.log('[SearchList.Item.onSelect]', item.id, item.label)}
                    />
                  ))}
                </SearchList.Group>
              ))}
              {results.length === 0 && <SearchList.Empty />}
            </SearchList.Viewport>
          </SearchList.Content>
        </Panel.Content>
      </Panel.Root>
    </SearchList.Root>
  );
};

//
// Meta
//

const meta = {
  title: 'ui/react-ui-search/SearchList',
  component: SearchList.Root as any,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
  args: {
    items: defaultItems,
  },
};

export const Controlled: Story = {
  render: ControlledStory,
  args: {
    items: defaultItems,
  },
};

export const CustomRendering: Story = {
  render: CustomRenderingStory,
  args: {
    items: defaultItems,
  },
};

export const WithEmpty: Story = {
  render: WithEmptyStory,
};

export const WithoutViewport: Story = {
  render: WithoutViewportStory,
  args: {
    items: defaultItems,
  },
};

export const WithIcons: Story = {
  render: WithIconsStory,
};

export const CustomInputExample: Story = {
  render: CustomInputStory,
  args: {
    items: defaultItems,
  },
};

export const WithDisabledItems: Story = {
  render: WithDisabledItemsStory,
};

export const WithGroups: Story = {
  render: WithGroupsStory,
};
