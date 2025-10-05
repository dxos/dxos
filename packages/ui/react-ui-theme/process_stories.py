#!/usr/bin/env python3
import re
import os
from pathlib import Path

base_dir = Path('/Users/burdon/Code/dxos/dxos/packages/ui/react-ui-theme')

files = [
    '../../../.idea/fileTemplates/Typescript storybook\u0f0fext\u0f0f.stories.tsx',
    '../../apps/composer-app/src/plugins/welcome/components/Welcome/Welcome.stories.tsx',
    '../../apps/composer-crx/src/components/Popup/Popup.stories.tsx',
    '../../apps/testbench-app/src/components/Main.stories.tsx',
    '../../common/keyboard/src/keyboard.stories.tsx',
    '../../common/storybook-utils/src/stories/test/Test.stories.tsx',
    '../../devtools/devtools/src/components/Bitbar.stories.tsx',
    '../../devtools/devtools/src/components/PropertiesTable.stories.tsx',
    '../../devtools/devtools/src/components/PublicKeySelector.stories.tsx',
    '../../devtools/devtools/src/components/Tree.stories.tsx',
    '../../devtools/devtools/src/components/performance/panels/SyncStatus/SyncStatus.stories.tsx',
    '../../devtools/devtools/src/panels/client/TracingPanel/TraceView.stories.tsx',
    '../../devtools/devtools/src/panels/mesh/SignalPanel/SignalMessageTable.stories.tsx',
    '../../plugins/plugin-excalidraw/src/components/SketchContainer/SketchContainer.stories.tsx',
    '../../plugins/plugin-explorer/src/components/Globe/Globe.stories.tsx',
    '../../plugins/plugin-markdown/src/components/MarkdownContainer.stories.tsx',
    '../../sdk/app-framework/src/components/App.stories.tsx',
    '../../sdk/app-framework/src/playground/playground.stories.tsx',
    '../../sdk/app-framework/src/react/Surface.stories.tsx',
    '../../sdk/app-framework/src/testing/withPluginManager.stories.tsx',
    '../../sdk/app-graph/src/stories/EchoGraph.stories.tsx',
    '../../sdk/examples/src/stories/examples.stories.tsx',
    '../../sdk/react-client/src/halo/Passkey.stories.tsx',
    '../../sdk/react-client/src/testing/ClientRepeater.stories.tsx',
    '../../sdk/react-client/src/testing/withClientProvider.stories.tsx',
    '../../sdk/schema/src/stories/ECHO.stories.tsx',
    '../../sdk/shell/src/components/CompoundButton/CompoundButton.stories.tsx',
    '../../sdk/shell/src/components/IdentityList/SpaceMemberList.stories.tsx',
    '../../sdk/shell/src/components/InvitationList/InvitationList.stories.tsx',
    '../../sdk/shell/src/components/Panel/Panel.stories.tsx',
    '../../sdk/shell/src/components/Viewport/Viewport.stories.tsx',
    '../../sdk/shell/src/panels/IdentityPanel/IdentityPanel.stories.tsx',
    '../../sdk/shell/src/panels/JoinPanel/JoinPanel.stories.tsx',
    '../../sdk/shell/src/panels/Panels.stories.tsx',
    '../../sdk/shell/src/panels/SpacePanel/SpacePanel.stories.tsx',
    '../../sdk/shell/src/stories/Invitations.stories.tsx',
    '../brand/src/Icons.stories.tsx',
    '../brand/src/Logotypes.stories.tsx',
    '../brand/src/components/ComposerLogo/ComposerLogo.stories.tsx',
    '../brand/src/components/rive.stories.tsx',
    '../primitives/react-hooks/src/useAsyncEffect.stories.tsx',
    '../react-ui-attention/src/components/AttentionGlyph.stories.tsx',
    '../react-ui-attention/src/components/AttentionProvider.stories.tsx',
    '../react-ui-board/src/components/Board/Board.stories.tsx',
    '../react-ui-board/src/components/Board/BoardCell.stories.tsx',
    '../react-ui-board/src/components/Chain/Chain.stories.tsx',
    '../react-ui-canvas-compute/src/compute.stories.tsx',
    '../react-ui-canvas-editor/src/components/Canvas/Frame.stories.tsx',
    '../react-ui-canvas-editor/src/components/Canvas/Path.stories.tsx',
    '../react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx',
    '../react-ui-canvas-editor/src/components/TextBox/TextBox.stories.tsx',
    '../react-ui-canvas/src/components/Canvas/Canvas.stories.tsx',
    '../react-ui-canvas/src/components/Grid/Grid.stories.tsx',
    '../react-ui-canvas/src/util/svg.stories.tsx',
    '../react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx',
    '../react-ui-components/src/components/Flex/Flex.stories.tsx',
    '../react-ui-components/src/components/MarkdownStream/MarkdownStream.stories.tsx',
    '../react-ui-components/src/components/MarkdownViewer/MarkdownViewer.stories.tsx',
    '../react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx',
    '../react-ui-components/src/components/ProgressBar/ProgressBar.stories.tsx',
    '../react-ui-components/src/components/QueryBox/QueryBox.stories.tsx',
    '../react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx',
    '../react-ui-components/src/components/ScrollContainer/ScrollContainer.stories.tsx',
    '../react-ui-components/src/components/SearchBox/SearchBox.stories.tsx',
    '../react-ui-components/src/components/TextBlock/TextBlock.stories.tsx',
    '../react-ui-components/src/components/TextCrawl/TextCrawl.stories.tsx',
    '../react-ui-components/src/components/Timeline/Timeline.stories.tsx',
    '../react-ui-components/src/components/ToggleContainer/ToggleContainer.stories.tsx',
    '../react-ui-form/src/components/ControlSection/ControlSection.stories.tsx',
    '../react-ui-form/src/components/FieldEditor/FieldEditor.stories.tsx',
    '../react-ui-form/src/components/Form/custom/SelectOptionsInput.stories.tsx',
    '../react-ui-form/src/components/ViewEditor/ViewEditor.stories.tsx',
    '../react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx',
    '../react-ui-geo/src/components/Globe/Globe.stories.tsx',
    '../react-ui-geo/src/components/Map/Map.stories.tsx',
    '../react-ui-graph/src/components/Graph/Graph.stories.tsx',
    '../react-ui-graph/src/components/Mesh/Mesh.stories.tsx',
    '../react-ui-graph/src/components/SVG/Svg.stories.tsx',
    '../react-ui-graph/src/fx/fx.stories.tsx',
    '../react-ui-graph/src/stories/hooks.stories.tsx',
    '../react-ui-grid/src/CellEditor/CellEditor.stories.tsx',
    '../react-ui-grid/src/Grid/Grid.stories.tsx',
    '../react-ui-list/src/components/Accordion/Accordion.stories.tsx',
    '../react-ui-list/src/components/List/List.stories.tsx',
    '../react-ui-list/src/components/Tree/Tree.stories.tsx',
    '../react-ui-menu/src/components/ToolbarMenu.stories.tsx',
    '../react-ui-pickers/src/components/EmojiPicker/EmojiPicker.stories.tsx',
    '../react-ui-pickers/src/components/HuePicker/HuePicker.stories.tsx',
    '../react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx',
    '../react-ui-searchlist/src/components/Listbox.stories.tsx',
    '../react-ui-searchlist/src/components/SearchList.stories.tsx',
    '../react-ui-searchlist/src/composites/PopoverCombobox.stories.tsx',
    '../react-ui-sfx/src/components/Bob.stories.tsx',
    '../react-ui-sfx/src/components/Chaos.stories.tsx',
    '../react-ui-sfx/src/components/Ghost.stories.tsx',
    '../react-ui-sfx/src/components/Oscilloscope.stories.tsx',
    '../react-ui-sfx/src/components/Sine.stories.tsx',
    '../react-ui-sfx/src/components/Spinner.stories.tsx',
    '../react-ui-sfx/src/components/Waveform.stories.tsx',
    '../react-ui-sfx/src/components/matrix.stories.tsx',
    '../react-ui-stack/src/components/Image/Image.stories.tsx',
    '../react-ui-stack/src/components/Stack/Stack.stories.tsx',
    '../react-ui-stack/src/components/StackItem/StackItem.stories.tsx',
    '../react-ui-stack/src/exemplars/Card/Card.stories.tsx',
    '../react-ui-stack/src/exemplars/CardStack/CardStack.stories.tsx',
    '../react-ui-syntax-highlighter/src/Json/Json.stories.tsx',
    '../react-ui-syntax-highlighter/src/SyntaxHighlighter/SyntaxHighlighter.stories.tsx',
    '../react-ui-table/src/components/Table/DynamicTable.stories.tsx',
    '../react-ui-table/src/components/Table/Relations.stories.tsx',
    '../react-ui-table/src/components/Table/Table.stories.tsx',
    '../react-ui-table/src/components/TableCellEditor/TableCellEditor.stories.tsx',
    '../react-ui-tabs/src/Tabs.stories.tsx',
    'src/Tokens.stories.tsx',
    '../react-ui-thread/src/Message/Message.stories.tsx',
    '../react-ui-thread/src/Thread/Comments.stories.tsx',
    '../react-ui-thread/src/Thread/Thread.stories.tsx',
    '../react-ui/src/components/Avatars/Avatar.stories.tsx',
    '../react-ui/src/components/Avatars/AvatarGroup.stories.tsx',
    '../react-ui/src/components/Breadcrumb/Breadcrumb.stories.tsx',
    '../react-ui/src/components/Buttons/Button.stories.tsx',
    '../react-ui/src/components/Buttons/IconButton.stories.tsx',
    '../react-ui/src/components/Buttons/Toggle.stories.tsx',
    '../react-ui/src/components/Buttons/ToggleGroup.stories.tsx',
    '../react-ui/src/components/Dialogs/AlertDialog.stories.tsx',
    '../react-ui/src/components/Dialogs/Dialog.stories.tsx',
    '../react-ui/src/components/Input/Input.stories.tsx',
    '../react-ui/src/components/Link/Link.stories.tsx',
    '../react-ui/src/components/Lists/List.stories.tsx',
    '../react-ui/src/components/Lists/Tree.stories.tsx',
    '../react-ui/src/components/Lists/Treegrid.stories.tsx',
    '../react-ui/src/components/Main/Main.stories.tsx',
    '../react-ui/src/components/Menus/ContextMenu.stories.tsx',
    '../react-ui/src/components/Menus/DropdownMenu.stories.tsx',
    '../react-ui/src/components/Message/Message.stories.tsx',
    '../react-ui/src/components/Popover/Popover.stories.tsx',
    '../react-ui/src/components/ScrollArea/ScrollArea.stories.tsx',
    '../react-ui/src/components/Select/Select.stories.tsx',
    '../react-ui/src/components/Status/Status.stories.tsx',
    '../react-ui/src/components/Tag/Tag.stories.tsx',
    '../react-ui/src/components/Toast/Toast.stories.tsx',
    '../react-ui/src/components/Toolbar/Toolbar.stories.tsx',
    '../react-ui/src/components/Tooltip/Tooltip.stories.tsx',
    '../react-ui/src/playground/Controls.stories.tsx',
    '../react-ui/src/playground/Custom.stories.tsx',
    '../react-ui/src/playground/Typography.stories.tsx',
]

def parse_meta_object(content):
    """Extract the meta object from the file content."""
    # Find the meta object
    meta_pattern = r'(const meta = \{)([\s\S]*?)(\} satisfies Meta<typeof [^>]+>;)'
    match = re.search(meta_pattern, content)

    if not match:
        return None, None, None, None

    return match.group(1), match.group(2), match.group(3), match.span()

def extract_properties(meta_body):
    """Extract properties from meta object body."""
    properties = {}
    current_prop = None
    current_value_lines = []
    brace_count = 0
    bracket_count = 0
    paren_count = 0

    lines = meta_body.split('\n')

    for line in lines:
        stripped = line.strip()

        # Skip empty lines when not in property
        if not current_prop and not stripped:
            continue

        # Check for new property start
        prop_match = re.match(r'^(title|component|render|decorators|parameters|args|tags):\s*(.*)$', stripped)

        if prop_match and brace_count == 0 and bracket_count == 0 and paren_count == 0:
            # Save previous property
            if current_prop:
                properties[current_prop] = current_value_lines

            # Start new property
            current_prop = prop_match.group(1)
            current_value_lines = [line]

            # Count delimiters in first line
            rest = prop_match.group(2)
            brace_count = rest.count('{') - rest.count('}')
            bracket_count = rest.count('[') - rest.count(']')
            paren_count = rest.count('(') - rest.count(')')
        elif current_prop:
            # Continue current property
            current_value_lines.append(line)

            # Update counts
            brace_count += line.count('{') - line.count('}')
            bracket_count += line.count('[') - line.count(']')
            paren_count += line.count('(') - line.count(')')

            # Check if property is complete
            if brace_count == 0 and bracket_count == 0 and paren_count == 0:
                if stripped.endswith(','):
                    properties[current_prop] = current_value_lines
                    current_prop = None
                    current_value_lines = []

    # Save last property
    if current_prop:
        properties[current_prop] = current_value_lines

    return properties

def format_property_lines(lines):
    """Format property lines, removing trailing comma if present."""
    if not lines:
        return []

    # Join and rejoin to normalize
    text = '\n'.join(lines).strip()

    # Remove trailing comma
    if text.endswith(','):
        text = text[:-1]

    return text.split('\n')

def expand_parameters(lines, base_indent):
    """Expand parameters to multiline if needed."""
    text = '\n'.join(lines).strip()

    # Check if it starts with parameters:
    if not text.startswith('parameters:'):
        return lines

    # Extract the value part
    match = re.match(r'parameters:\s*(.+)', text, re.DOTALL)
    if not match:
        return lines

    value = match.group(1).strip()

    # If already multiline (contains newlines), return as-is
    if '\n' in value:
        result_lines = []
        for line in lines:
            result_lines.append(line)
        return result_lines

    # If single-line object like { chromatic: { disableSnapshot: false } }
    if value.startswith('{') and value.endswith('}'):
        # Simple expansion - just split opening and closing braces
        inner = value[1:-1].strip()
        if inner:
            return [
                f'{base_indent}parameters: {{',
                f'{base_indent}  {inner},',
                f'{base_indent}}},']

    return lines

def rebuild_meta(properties, base_indent='  '):
    """Rebuild meta object with correct property order."""
    property_order = ['title', 'component', 'render', 'decorators', 'parameters', 'args', 'tags']
    result_lines = []

    for prop_name in property_order:
        if prop_name in properties:
            prop_lines = format_property_lines(properties[prop_name])

            # Special handling for parameters
            if prop_name == 'parameters':
                prop_lines = expand_parameters(prop_lines, base_indent)

            # Add comma to last line if not present
            if prop_lines:
                last_line = prop_lines[-1].rstrip()
                if not last_line.endswith(','):
                    prop_lines[-1] = last_line + ','

            result_lines.extend(prop_lines)

    return '\n'.join(result_lines)

def process_file(file_path):
    """Process a single file."""
    try:
        if not os.path.exists(file_path):
            return False, 'File not found'

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        meta_start, meta_body, meta_end, span = parse_meta_object(content)

        if not meta_start:
            return False, 'No meta object found'

        # Extract base indent from first non-empty line
        lines = [l for l in meta_body.split('\n') if l.strip()]
        base_indent = '  '
        if lines:
            match = re.match(r'^(\s*)', lines[0])
            if match:
                base_indent = match.group(1)

        properties = extract_properties(meta_body)

        if not properties:
            return False, 'No properties found'

        # Rebuild meta object
        new_meta_body = rebuild_meta(properties, base_indent)

        # Reconstruct full meta object
        new_meta = f'{meta_start}\n{new_meta_body}\n{meta_end}'

        # Replace in content
        new_content = content[:span[0]] + new_meta + content[span[1]:]

        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        return True, None

    except Exception as e:
        return False, str(e)

# Process all files
success_count = 0
error_count = 0
errors = []

for file_rel in files:
    file_path = (base_dir / file_rel).resolve()
    success, error = process_file(file_path)

    if success:
        success_count += 1
        print(f'✓ {file_rel}')
    else:
        error_count += 1
        errors.append((file_rel, error))
        print(f'✗ {file_rel}: {error}')

print('\n' + '=' * 80)
print(f'Successfully updated: {success_count} files')
print(f'Failed: {error_count} files')

if errors:
    print('\nErrors:')
    for file, error in errors:
        print(f'  {file}: {error}')
