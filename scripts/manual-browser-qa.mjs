import { createServer } from 'node:net';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const distPath = path.resolve(repoRoot, 'dist');
const screenshotsPath = path.resolve(repoRoot, 'docs', 'screenshots');
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

const browsers = [
  {
    name: 'Chrome',
    candidates: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ],
    extensionsUrl: 'chrome://extensions'
  },
  {
    name: 'Edge',
    candidates: [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
    ],
    extensionsUrl: 'edge://extensions'
  },
  {
    name: 'Brave',
    candidates: [
      'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
      'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
    ],
    extensionsUrl: 'brave://extensions'
  }
];

async function main() {
  assertDistReady();

  const results = [];
  for (const browser of browsers) {
    results.push(await runBrowserQa(browser));
  }

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    distPath,
    results
  }, null, 2));

  if (results.some((result) => result.status === 'failed')) {
    process.exitCode = 1;
  }
}

function assertDistReady() {
  const manifestPath = path.join(distPath, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error('dist/manifest.json is missing. Run npm run build before manual browser QA.');
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const permissions = [
    ...(Array.isArray(manifest.permissions) ? manifest.permissions : []),
    ...(Array.isArray(manifest.optional_permissions) ? manifest.optional_permissions : [])
  ];
  const forbidden = permissions.filter((permission) => forbiddenPermissions.has(permission));
  if (forbidden.length > 0) {
    throw new Error(`Forbidden permissions present in dist manifest: ${forbidden.join(', ')}`);
  }
}

async function runBrowserQa(browser) {
  const executable = browser.candidates.find((candidate) => existsSync(candidate));
  if (!executable) {
    return {
      browser: browser.name,
      status: 'blocked',
      reason: 'Browser executable not found on this machine.',
      checked: []
    };
  }

  const profileDir = path.join(tmpdir(), `hermes-extension-${browser.name.toLowerCase()}-${Date.now()}`);
  mkdirSync(profileDir, { recursive: true });
  const port = await getFreePort();
  let child;

  try {
    child = spawn(executable, [
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${port}`,
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-sync',
      '--window-size=1280,900',
      'https://example.com'
    ], {
      stdio: 'ignore',
      windowsHide: false
    });

    child.unref();

    const version = await waitFor(() => fetchJson(`http://127.0.0.1:${port}/json/version`), 12_000);
    const extensionIds = await waitFor(() => readLoadedExtensionIds(port, profileDir), 12_000);
    const { extensionId, extensionPage, bodyText } = await openHermesExtensionPage(
      version.webSocketDebuggerUrl,
      port,
      extensionIds
    );
    const sidePanelPath = await evaluateText(
      extensionPage.webSocketDebuggerUrl,
      'chrome.runtime.getManifest().side_panel.default_path'
    );
    const hasAgentModeRegion = await evaluateText(
      extensionPage.webSocketDebuggerUrl,
      'Boolean(document.querySelector(\'[aria-label="Agent mode"]\'))'
    );
    const targetUrls = await fetchJson(`http://127.0.0.1:${port}/json/list`);
    const exampleTarget = targetUrls.find((target) => target.url?.startsWith('https://example.com'));

    const requiredText = [
      'Hermes Agents',
      'Connection',
      'Context',
      'What Hermes saw',
      'Diagnostics',
      'Paste the Hermes API_SERVER_KEY',
      'Authorization: Bearer'
    ];
    const missingText = requiredText.filter((text) => !bodyText.includes(text));
    if (missingText.length > 0) {
      throw new Error(`Extension UI missing expected text: ${missingText.join(', ')}`);
    }

    if (!hasAgentModeRegion) {
      throw new Error('Extension UI missing Agent mode region.');
    }

    if (sidePanelPath !== 'src/sidepanel/index.html') {
      throw new Error(`Unexpected side panel default path: ${sidePanelPath}`);
    }

    if (!exampleTarget) {
      throw new Error('https://example.com target was not opened.');
    }

    const connectionState = await testGatewayConnection(extensionPage.webSocketDebuggerUrl);
    const screenshotPath = await captureExtensionScreenshot(
      extensionPage.webSocketDebuggerUrl,
      browser.name
    );

    return {
      browser: browser.name,
      status: 'passed',
      executable,
      browserVersion: version.Browser,
      extensionId,
      checked: [
        `${browser.extensionsUrl} can load unpacked dist profile entry`,
        'dist manifest has no forbidden v0.1 permissions',
        'extension service/profile entry detected',
        'side panel default path is src/sidepanel/index.html',
        'side panel page renders core UI text',
        `extension UI screenshot saved: ${path.relative(repoRoot, screenshotPath)}`,
        `local Hermes Gateway test connection result: ${connectionState}`,
        'https://example.com opens in the QA profile'
      ]
    };
  } catch (error) {
    if (browser.name === 'Chrome') {
      return {
        browser: browser.name,
        status: 'blocked',
        executable,
        reason: 'Google Chrome 137+ disables command-line --load-extension; use chrome://extensions Developer mode > Load unpacked for true manual UI QA.',
        checked: [
          'browser executable starts',
          'dist manifest has no forbidden v0.1 permissions',
          'command-line unpacked extension load is blocked by Chrome policy'
        ]
      };
    }

    return {
      browser: browser.name,
      status: 'failed',
      executable,
      reason: error instanceof Error ? error.message : String(error),
      checked: []
    };
  } finally {
    await cleanupBrowserProfile(child?.pid, profileDir);
  }
}

async function openHermesExtensionPage(browserWebSocketUrl, port, extensionIds) {
  let lastError;

  for (const extensionId of extensionIds) {
    try {
      const pageTarget = await createTarget(
        browserWebSocketUrl,
        `chrome-extension://${extensionId}/src/sidepanel/index.html`
      );
      const extensionPage = await waitFor(() => findTarget(port, pageTarget.targetId), 4_000);
      const manifestName = await waitFor(
        () => evaluateText(extensionPage.webSocketDebuggerUrl, 'chrome.runtime?.getManifest?.().name'),
        3_000
      );

      if (manifestName !== 'Hermes Agents Chrome Extension') {
        continue;
      }

      const bodyText = await waitFor(
        () => evaluateText(extensionPage.webSocketDebuggerUrl, 'document.body.innerText'),
        12_000
      );
      return { extensionId, extensionPage, bodyText };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Hermes extension page could not be opened from detected extension ids.');
}

async function createTarget(browserWebSocketUrl, url) {
  return cdpCommand(browserWebSocketUrl, 'Target.createTarget', { url });
}

async function evaluateText(webSocketUrl, expression) {
  const result = await cdpCommand(webSocketUrl, 'Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed.');
  }
  return result.result?.value;
}

async function testGatewayConnection(webSocketUrl) {
  const result = await evaluateText(
    webSocketUrl,
    `new Promise((resolve) => {
      const button = Array.from(document.querySelectorAll('button'))
        .find((candidate) => candidate.textContent.trim() === 'Test connection');
      if (!button) {
        resolve('missing Test connection button');
        return;
      }

      button.click();
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        const text = document.body.innerText;
        const match = text.match(/Connected · warning|Connected|Connection error|Fallback mode/);
        if (match || attempts >= 40) {
          clearInterval(timer);
          resolve(match?.[0] ?? 'timeout');
        }
      }, 250);
    })`
  );

  if (result !== 'Connected' && result !== 'Connected · warning') {
    throw new Error(`Local Hermes Gateway connection did not reach a connected state: ${result}`);
  }

  return result;
}

async function captureExtensionScreenshot(webSocketUrl, browserName) {
  mkdirSync(screenshotsPath, { recursive: true });
  await cdpCommand(webSocketUrl, 'Page.enable');
  const result = await cdpCommand(webSocketUrl, 'Page.captureScreenshot', {
    format: 'png',
    fromSurface: true
  });
  if (typeof result.data !== 'string') {
    throw new Error('Screenshot capture returned no data.');
  }

  const filePath = path.join(screenshotsPath, `${browserName.toLowerCase()}-sidepanel.png`);
  writeFileSync(filePath, Buffer.from(result.data, 'base64'));
  return filePath;
}

async function cdpCommand(webSocketUrl, method, params = {}) {
  const ws = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  try {
    return await new Promise((resolve, reject) => {
      const messageId = ++id;
      ws.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== messageId) {
          return;
        }
        if (message.error) {
          reject(new Error(message.error.message));
          return;
        }
        resolve(message.result);
      });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });
  } finally {
    ws.close();
  }
}

async function findTarget(port, targetId) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const target = targets.find((candidate) => candidate.id === targetId);
  if (!target?.webSocketDebuggerUrl) {
    throw new Error(`CDP target ${targetId} not ready yet.`);
  }
  return target;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response.json();
}

async function readLoadedExtensionIds(port, profileDir) {
  const targetExtensionIds = await readExtensionIdsFromTargets(port);
  if (targetExtensionIds.length > 0) {
    return targetExtensionIds;
  }

  const preferencesPath = path.join(profileDir, 'Default', 'Preferences');
  if (!existsSync(preferencesPath)) {
    throw new Error('Browser Preferences file is not ready yet.');
  }

  const preferences = JSON.parse(readFileSync(preferencesPath, 'utf8'));
  const settings = preferences.extensions?.settings ?? {};
  const distComparable = normalizePath(distPath);

  for (const [extensionId, info] of Object.entries(settings)) {
    if (normalizePath(info?.path ?? '') === distComparable) {
      return [extensionId];
    }
  }

  throw new Error('Loaded extension entry for dist/ was not found in browser profile.');
}

async function readExtensionIdsFromTargets(port) {
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const ids = targets
    .map((target) => target.url ?? '')
    .filter((url) => url.startsWith('chrome-extension://'))
    .filter((url) => url.endsWith('/src/background/background.js'))
    .map((url) => new URL(url).host);

  return Array.from(new Set(ids));
}

function normalizePath(value) {
  return path.resolve(String(value)).toLowerCase();
}

async function waitFor(fn, timeoutMs) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await fn();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw lastError instanceof Error ? lastError : new Error('Timed out waiting for QA condition.');
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : undefined;
      server.close(() => {
        if (port) {
          resolve(port);
        } else {
          reject(new Error('Unable to allocate a free port.'));
        }
      });
    });
    server.on('error', reject);
  });
}

function killProcessTree(pid) {
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // Process already exited.
  }
}

async function cleanupBrowserProfile(pid, profileDir) {
  if (pid) {
    killProcessTree(pid);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      rmSync(profileDir, { recursive: true, force: true });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  console.error(`warning: unable to remove temporary QA profile: ${profileDir}`);
}

await main();
