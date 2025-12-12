import { parser } from '@lezer/markdown';

const text = '# Hello\nThis is a test message.';
const tree = parser.parse(text);

console.log('Tree:', tree);

function print(cursor, depth = 0) {
  do {
    console.log(`${' '.repeat(depth * 2)}Node: ${cursor.name} from: ${cursor.from} to: ${cursor.to}`);
    if (cursor.firstChild()) {
      print(cursor, depth + 1);
      cursor.parent();
    }
  } while (cursor.nextSibling());
}

print(tree.cursor());
