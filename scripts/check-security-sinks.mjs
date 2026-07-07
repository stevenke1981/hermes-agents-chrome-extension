import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const textExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.html']);
const scanRoots = ['src', 'manifest.json', 'dist/manifest.json'];

const forbiddenPatterns = [
  /\bchrome\.debugger\b/,
  /\bchrome\.downloads\b/,
  /\bchrome\.cookies\b/,
  /\bchrome\.history\b/,
  /\bchrome\.bookmarks\b/,
  /\bchrome\.webNavigation\b/,
  /\bnativeMessaging\b/,
  /\bdocument\.cookie\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\.click\s*\(/,
  /\.submit\s*\(/,
  /\bnew\s+MouseEvent\b/,
  /\bnew\s+KeyboardEvent\b/,
  /\bdispatchEvent\s*\(/
];

function listFiles(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  if (!textExtensions.has(extname(absolutePath)) && extname(absolutePath) !== '') {
    return [];
  }

  if (extname(absolutePath) !== '') {
    return [absolutePath];
  }

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const child = join(relativePath, entry.name);
    return entry.isDirectory() ? listFiles(child) : listFiles(child);
  });
}

for (const file of scanRoots.flatMap(listFiles)) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      throw new Error(`Forbidden v0.1 browser-control or storage sink in ${file}: ${pattern}`);
    }
  }
}

console.log('security sink check passed');
