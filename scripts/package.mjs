import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const artifacts = join(root, 'artifacts');
const artifact = join(artifacts, 'hermes-agents-chrome-extension-v0.1.0.zip');

if (!existsSync(join(dist, 'manifest.json'))) {
  throw new Error('dist/manifest.json is missing. Run npm run build first.');
}

mkdirSync(artifacts, { recursive: true });

const compress = spawnSync(
  'powershell',
  ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}\\*' -DestinationPath '${artifact}' -Force`],
  { stdio: 'inherit' }
);

if (compress.status !== 0) {
  throw new Error('Failed to create release zip artifact');
}

console.log(`created ${artifact}`);

