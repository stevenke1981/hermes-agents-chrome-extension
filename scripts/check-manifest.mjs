import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const forbiddenPermissions = new Set([
  'debugger',
  'nativeMessaging',
  'cookies',
  'history',
  'downloads',
  'bookmarks',
  'webNavigation',
  'unlimitedStorage'
]);

const allowedPermissions = new Set(['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs']);
const allowedOptionalPermissions = new Set(['audioCapture']);
const requiredPermissions = ['activeTab', 'scripting', 'sidePanel', 'storage', 'tabs'];
const allowedMatches = new Set(['http://*/*', 'https://*/*']);

function readManifest(relativePath) {
  const manifestPath = join(root, relativePath);
  if (!existsSync(manifestPath)) {
    return null;
  }

  return {
    label: relativePath,
    value: JSON.parse(readFileSync(manifestPath, 'utf8'))
  };
}

function assertPermissions(label, manifest) {
  const permissionFields = [
    ['permissions', manifest.permissions ?? [], allowedPermissions],
    ['optional_permissions', manifest.optional_permissions ?? [], allowedOptionalPermissions]
  ];

  for (const [field, permissions, allowed] of permissionFields) {
    for (const permission of permissions) {
      if (forbiddenPermissions.has(permission)) {
        throw new Error(`${label}: ${field} includes forbidden v0.1 permission: ${permission}`);
      }

      if (!allowed.has(permission)) {
        throw new Error(`${label}: ${field} includes unexpected permission: ${permission}`);
      }
    }
  }

  for (const permission of requiredPermissions) {
    if (!manifest.permissions?.includes(permission)) {
      throw new Error(`${label}: missing required v0.1 permission: ${permission}`);
    }
  }
}

function assertContentScripts(label, manifest) {
  for (const script of manifest.content_scripts ?? []) {
    for (const match of script.matches ?? []) {
      if (!allowedMatches.has(match)) {
        throw new Error(`${label}: content script match is outside v0.1 scope: ${match}`);
      }
    }
  }
}

function assertCsp(label, manifest) {
  const csp = manifest.content_security_policy?.extension_pages ?? '';
  if (/script-src[^;]*(https?:|blob:|data:|'unsafe-inline'|'unsafe-eval')/i.test(csp)) {
    throw new Error(`${label}: content_security_policy.extension_pages allows unsafe script sources`);
  }
}

function assertCommon(label, manifest) {
  if (manifest.manifest_version !== 3) {
    throw new Error(`${label}: manifest_version must be 3`);
  }

  if (manifest.minimum_chrome_version !== '114') {
    throw new Error(`${label}: minimum_chrome_version must be 114`);
  }

  assertPermissions(label, manifest);
  assertContentScripts(label, manifest);
  assertCsp(label, manifest);
}

function assertRootPaths(manifest) {
  const requiredPaths = [
    manifest.background?.service_worker?.replace(/\.js$/, '.ts'),
    manifest.side_panel?.default_path,
    ...(manifest.content_scripts ?? []).flatMap((script) =>
      (script.js ?? []).map((path) => path.replace(/\.js$/, '.ts'))
    )
  ].filter(Boolean);

  for (const relativePath of requiredPaths) {
    if (!existsSync(join(root, relativePath))) {
      throw new Error(`manifest.json references missing source path: ${relativePath}`);
    }
  }

  const iconPaths = [
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {})
  ];
  for (const relativePath of iconPaths) {
    if (!relativePath.endsWith('.png')) {
      throw new Error(`manifest.json icon must be PNG for Chrome load unpacked: ${relativePath}`);
    }

    if (!existsSync(join(root, 'public', relativePath))) {
      throw new Error(`manifest.json references missing icon: public/${relativePath}`);
    }
  }
}

function assertDistPaths(manifest) {
  const requiredPaths = [
    manifest.background?.service_worker,
    manifest.side_panel?.default_path,
    ...(manifest.content_scripts ?? []).flatMap((script) => script.js ?? []),
    ...Object.values(manifest.icons ?? {}),
    ...Object.values(manifest.action?.default_icon ?? {})
  ].filter(Boolean);

  for (const relativePath of requiredPaths) {
    if (relativePath.startsWith('icons/') && !relativePath.endsWith('.png')) {
      throw new Error(`dist/manifest.json icon must be PNG for Chrome load unpacked: ${relativePath}`);
    }

    if (!existsSync(join(root, 'dist', relativePath))) {
      throw new Error(`dist/manifest.json references missing dist path: ${relativePath}`);
    }
  }
}

const rootManifest = readManifest('manifest.json');
if (!rootManifest) {
  throw new Error('manifest.json is missing');
}

assertCommon(rootManifest.label, rootManifest.value);
assertRootPaths(rootManifest.value);

const distManifest = readManifest('dist/manifest.json');
if (distManifest && statSync(join(root, 'dist/manifest.json')).mtimeMs >= statSync(join(root, 'manifest.json')).mtimeMs) {
  assertCommon(distManifest.label, distManifest.value);
  assertDistPaths(distManifest.value);
}

console.log('manifest check passed');
