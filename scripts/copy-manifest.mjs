import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

if (!existsSync(dist)) {
  throw new Error('dist/ does not exist. Run vite build first.');
}

copyFileSync(join(root, 'manifest.json'), join(dist, 'manifest.json'));
mkdirSync(join(dist, 'icons'), { recursive: true });

for (const size of [16, 32, 48, 128]) {
  copyFileSync(join(root, 'public', 'icons', `icon-${size}.png`), join(dist, 'icons', `icon-${size}.png`));
}

console.log('manifest and icons copied to dist');
