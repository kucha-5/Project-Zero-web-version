const { app, BrowserWindow, ipcMain, shell, Tray, Menu, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');
const { isLauncherUpdateAvailable } = require('./update-policy');
const { classifyUpdateAsset, findLauncherRuntime } = require('./update-package');

const NETWORK_RETRY_DELAYS = [0, 1000, 3000, 7000];
const MAX_LAUNCHER_UPDATE_BYTES = 1024 * 1024 * 1024;
const STRIPE_PAYMENT_LINKS = new Set([
  'https://buy.stripe.com/bJe00j3iU9nB0si9wIdMI04',
  'https://buy.stripe.com/6oU3cvaLmfLZ0si24gdMI01',
  'https://buy.stripe.com/14A14ncTufLZ8YOaAMdMI05',
  'https://buy.stripe.com/dRm14nf1C0R57UK7oAdMI03',
  'https://buy.stripe.com/dRm7sL06IczN1wm38kdMI00',
  'https://buy.stripe.com/cNieVd06IgQ34Iy38kdMI02'
]);

const startupLogPath = path.join(os.tmpdir(), 'SF-Launcher-startup.log');

function startupLog(message, error = null) {
  try {
    const details = error ? `\n${error.stack || error.message || String(error)}` : '';
    fs.appendFileSync(startupLogPath, `[${new Date().toISOString()}] ${message}${details}\n`, 'utf8');
  } catch {
    // Logging must never prevent the launcher from opening.
  }
}

function showStartupFailure(error) {
  startupLog('Launcher startup failed', error);
  try {
    dialog.showErrorBox(
      'SF Launcher',
      `启动器无法启动。请把这个日志文件发给开发者：\n${startupLogPath}\n\n${error?.message || String(error)}`
    );
  } catch {
    // The log remains available even if Electron cannot show a dialog.
  }
}

process.on('uncaughtException', showStartupFailure);
process.on('unhandledRejection', showStartupFailure);

// Some Windows graphics drivers can prevent an Electron window from appearing.
// The launcher UI does not need GPU acceleration, so prefer the compatible path.
app.disableHardwareAcceleration();

let launcherWindow = null;
let gameWindow = null;
let showcaseWindow = null;
let tray = null;
let updateInProgress = false;

const rootDir = __dirname;
const bundledGameDir = path.join(rootDir, 'Game');
const gameDir = path.join(app.getPath('userData'), 'Game');
const gameEntry = path.join(gameDir, 'index.html');
const showcaseEntry = path.join(rootDir, 'ExecutorTool', 'index.html');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const appIcon = path.join(__dirname, 'build', 'icon.ico');
const projectZeroIconSource = path.join(__dirname, 'build', 'project_zero.ico');
const projectZeroIconInstalled = path.join(app.getPath('userData'), 'ProjectZero.ico');
const trayIcon = path.join(__dirname, 'build', 'icon.ico');
const launcherExecutable = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
const externalChannelPath = path.join(path.dirname(launcherExecutable), 'release-channel.json');
const packagedChannelPath = path.join(rootDir, 'release-channel.json');
const launcherPackage = require('./package.json');
const launcherBuild = String(launcherPackage.buildId || '').trim();

const REQUIRED_GAME_FILES = [
  'index.html', 'style.css', 'version.json', 'update-client.js', 'locales.js',
  'account-config.js', 'pz-account-api.js', 'game_quality_update.js',
  'story_scripts.js', 'story_events.js', 'story_engine.js',
  'story_chapter0_zh.js', 'story_chapter0_en.js', 'story_chapter1_zh.js', 'story_chapter1_en.js',
  'story_chapter2_zh.js', 'story_chapter2_en.js', 'game_crystal_modules.js', 'game.js',
  'game_match3.js', 'game_patrol.js', 'game_side_story.js', 'game_daydream.js', 'game_daydream_title.js',
  path.join('assets', 'ui', 'project_zero_logo.png')
];

// Audio improves presentation but must never prevent a valid game build from
// launching. Missing bundled tracks are repaired opportunistically below.
const OPTIONAL_GAME_FILES = [
  path.join('assets', 'audio', 'bgm', 'last_safe_city.mp3'),
  path.join('assets', 'audio', 'bgm', 'skyglass_bazaar.mp3'),
  path.join('assets', 'audio', 'bgm', 'kros_battle.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter0_operation.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter0_battle.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter0_boss.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter1_operation.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter1_battle.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter1_boss.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter2_operation.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter2_battle.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter3_operation.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter3_battle.mp3'),
  path.join('assets', 'audio', 'bgm', 'chapter3_part2_operation.mp3'),
  path.join('assets', 'audio', 'bgm', 'operation_world.mp3')
];

const defaultSettings = {
  returnToLauncher: true,
  hideLauncherOnPlay: true,
  closeToTray: false,
  language: 'zh-CN',
  autoCheckUpdate: true,
  accountApiUrl: 'https://sf-account.yuyangchen2014.workers.dev',
  installedVersion: '0.0.0',
  bundledBuildInstalled: ''
};

function readReleaseChannel() {
  const candidates = [externalChannelPath, packagedChannelPath];
  const errors = [];
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const channel = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      const gameManifestUrl = String(channel.gameManifestUrl || '').trim();
      const launcherManifestUrl = String(channel.launcherManifestUrl || '').trim();
      const allowedDownloadHosts = Array.isArray(channel.allowedDownloadHosts)
        ? channel.allowedDownloadHosts.map(value => String(value).trim().toLowerCase()).filter(Boolean)
        : [];
      if (!gameManifestUrl || !launcherManifestUrl || !allowedDownloadHosts.length) {
        throw new Error('缺少 gameManifestUrl、launcherManifestUrl 或 allowedDownloadHosts');
      }
      return {
        gameManifestUrl,
        launcherManifestUrl,
        allowedDownloadHosts,
        allowedDownloadPathPrefixes: Array.isArray(channel.allowedDownloadPathPrefixes)
          ? channel.allowedDownloadPathPrefixes.map(value => String(value).trim()).filter(Boolean)
          : []
      };
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  throw new Error(`发布通道配置无效。${errors.join(' | ')}`);
}

function readSettings() {
  try {
    if (!fs.existsSync(settingsPath)) return { ...defaultSettings };
    return { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
  } catch {
    return { ...defaultSettings };
  }
}

function writeSettings(next) {
  const merged = { ...readSettings(), ...next };
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function removeDirectorySafe(folder) {
  try { fs.rmSync(folder, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }); }
  catch (error) { startupLog(`Unable to clean ${folder}`, error); }
}

function sanitizeUserSettingsPatch(patch) {
  const safe = {};
  for (const key of ['returnToLauncher', 'hideLauncherOnPlay', 'closeToTray', 'autoCheckUpdate']) {
    if (typeof patch?.[key] === 'boolean') safe[key] = patch[key];
  }
  if (patch?.language === 'zh-CN' || patch?.language === 'en-US') safe.language = patch.language;
  return safe;
}

function compareVersion(a, b) {
  const rawA = String(a || '').trim();
  const rawB = String(b || '').trim();
  if (rawA === rawB) return 0;
  // An unfamiliar non-numeric release id is still a real new candidate.
  // Exact equality above prevents repeatedly installing the same id.
  if (!/^\d+(?:\.\d+)*$/.test(rawA) || !/^\d+(?:\.\d+)*$/.test(rawB)) return 1;
  const aa = rawA.split('.').map(v => Number.parseInt(v, 10) || 0);
  const bb = rawB.split('.').map(v => Number.parseInt(v, 10) || 0);
  for (let i = 0; i < Math.max(aa.length, bb.length); i += 1) {
    if ((aa[i] || 0) !== (bb[i] || 0)) return (aa[i] || 0) - (bb[i] || 0);
  }
  return 0;
}

function bundledGameInfo() {
  return bundledGameInfoFrom(bundledGameDir);
}

function bundledGameInfoFrom(folder) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(folder, 'version.json'), 'utf8'));
    return { version: String(data.version || ''), build: String(data.build || '') };
  } catch { return { version: '', build: '' }; }
}

function fileSha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function copyDirectoryTree(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) copyDirectoryTree(source, target);
    else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, fs.readFileSync(source));
    }
  }
}

function ensureProjectZeroIcon() {
  try {
    if (!fs.existsSync(projectZeroIconSource)) return appIcon;
    const sourceHash = fileSha256(projectZeroIconSource);
    const targetIsCurrent = fs.existsSync(projectZeroIconInstalled)
      && fs.statSync(projectZeroIconInstalled).isFile()
      && fileSha256(projectZeroIconInstalled) === sourceHash;
    if (!targetIsCurrent) {
      fs.mkdirSync(path.dirname(projectZeroIconInstalled), { recursive: true });
      fs.writeFileSync(projectZeroIconInstalled, fs.readFileSync(projectZeroIconSource));
    }
    return projectZeroIconInstalled;
  } catch (error) {
    startupLog('Project Zero icon preparation failed', error);
    return appIcon;
  }
}

function validateGameFolder(folder, compareWithBundled = false) {
  const missing = [];
  const corrupt = [];
  const optionalMissing = [];
  const optionalCorrupt = [];
  for (const relativePath of REQUIRED_GAME_FILES) {
    const candidate = path.join(folder, relativePath);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      missing.push(relativePath.replace(/\\/g, '/'));
      continue;
    }
    if (compareWithBundled) {
      const bundled = path.join(bundledGameDir, relativePath);
      if (fs.existsSync(bundled) && (fs.statSync(candidate).size !== fs.statSync(bundled).size || fileSha256(candidate) !== fileSha256(bundled))) {
        corrupt.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }
  for (const relativePath of OPTIONAL_GAME_FILES) {
    const candidate = path.join(folder, relativePath);
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      optionalMissing.push(relativePath.replace(/\\/g, '/'));
      continue;
    }
    if (compareWithBundled) {
      const bundled = path.join(bundledGameDir, relativePath);
      if (fs.existsSync(bundled) && (fs.statSync(candidate).size !== fs.statSync(bundled).size || fileSha256(candidate) !== fileSha256(bundled))) {
        optionalCorrupt.push(relativePath.replace(/\\/g, '/'));
      }
    }
  }
  return {
    ok: missing.length === 0 && corrupt.length === 0,
    missing,
    corrupt,
    optionalMissing,
    optionalCorrupt
  };
}

function repairMissingOptionalFiles(folder) {
  const repaired = [];
  for (const relativePath of OPTIONAL_GAME_FILES) {
    const source = path.join(bundledGameDir, relativePath);
    const target = path.join(folder, relativePath);
    if (fs.existsSync(target) || !fs.existsSync(source) || !fs.statSync(source).isFile()) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    repaired.push(relativePath.replace(/\\/g, '/'));
  }
  return repaired;
}

function canVerifyAgainstBundled() {
  const settings = readSettings();
  const bundled = bundledGameInfo();
  return Boolean(bundled.build && settings.bundledBuildInstalled === bundled.build);
}

function ensureInstalledGame() {
  const bundledEntry = path.join(bundledGameDir, 'index.html');
  if (!fs.existsSync(bundledEntry)) return;
  const settings = readSettings();
  const bundled = bundledGameInfo();
  const bundledVersion = bundled.version;
  const installed = bundledGameInfoFrom(gameDir);
  const installedVersion = installed.version || settings.installedVersion;
  const missingRuntime = !validateGameFolder(gameDir).ok;
  const bundledIsNewer = bundledVersion && compareVersion(bundledVersion, installedVersion) > 0;
  const installedIsOnlineBuild = Boolean(installed.build)
    && settings.bundledBuildInstalled === `online:${installed.build}`;
  const bundledBuildChanged = Boolean(
    bundledVersion && bundled.build
    && compareVersion(bundledVersion, installedVersion) === 0
    && bundled.build !== installed.build
    && !installedIsOnlineBuild
  );
  // A valid GitHub-installed build with the same semantic version must remain
  // authoritative. The bundled copy is only a fallback or a true version upgrade.
  if (!fs.existsSync(gameEntry) || missingRuntime || bundledIsNewer || bundledBuildChanged) {
    const parent = path.dirname(gameDir);
    const staging = path.join(parent, 'Game.initializing');
    const backup = path.join(parent, 'Game.previous');
    fs.mkdirSync(parent, { recursive: true });
    removeDirectorySafe(staging);
    copyDirectoryTree(bundledGameDir, staging);
    const staged = validateGameFolder(staging, true);
    if (!staged.ok) {
      removeDirectorySafe(staging);
      throw new Error(`内置游戏文件不完整：${[...staged.missing, ...staged.corrupt].join(', ')}`);
    }
    removeDirectorySafe(backup);
    if (fs.existsSync(gameDir)) fs.renameSync(gameDir, backup);
    try {
      fs.renameSync(staging, gameDir);
      if (bundledVersion) writeSettings({ installedVersion: bundledVersion, bundledBuildInstalled: bundled.build });
      removeDirectorySafe(backup);
    } catch (error) {
      removeDirectorySafe(gameDir);
      if (fs.existsSync(backup)) fs.renameSync(backup, gameDir);
      throw error;
    }
  }
  repairMissingOptionalFiles(gameDir);
}

function sendProgress(stage, percent, downloaded = 0, total = 0) {
  if (!launcherWindow || launcherWindow.isDestroyed()) return;
  launcherWindow.webContents.send('download-progress', {
    stage, percent: Math.max(0, Math.min(100, Math.round(percent))),
    downloaded: Math.round(downloaded / 1048576), total: total ? Math.round(total / 1048576) : 0
  });
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `解压失败 (${code})`)));
  });
}

function parseManifestText(text) {
  const source = String(text || '').trim().replace(/^\uFEFF/, '');
  const candidates = [
    source,
    source.replace(/^(?:window\.[\w$.]+|(?:const|let|var)\s+[\w$]+|module\.exports)\s*=\s*/i, '').replace(/;+\s*$/, ''),
    source.replace(/^export\s+default\s+/i, '').replace(/;+\s*$/, '')
  ];
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch {}
  }
  throw new Error('版本清单格式无效');
}

function manifestUrlCandidates(configuredUrl, kind = 'game') {
  const urls = [];
  const add = value => {
    const url = String(value || '').trim();
    if (url && !urls.includes(url)) urls.push(url);
  };
  add(configuredUrl);
  if (/version\.json(?:[?#].*)?$/i.test(configuredUrl || '')) add(String(configuredUrl).replace(/version\.json/i, 'version.js'));
  if (/version\.js(?:[?#].*)?$/i.test(configuredUrl || '')) add(String(configuredUrl).replace(/version\.js/i, 'version.json'));
  const rawMatch=String(configuredUrl||'').match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
  if(rawMatch){
    const [,owner,repo,branch,file]=rawMatch;
    add(`https://github.com/${owner}/${repo}/raw/refs/heads/${branch}/${file}`);
    add(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${branch}/${file}`);
    add(`https://${owner}.github.io/${repo}/${file}`);
    add(`https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${file}`);
  }
  const manifestFiles = kind === 'launcher'
    ? ['launcher-version.json', 'launcher-version.js']
    : ['version.json', 'version.js'];
  const repositories = kind === 'launcher'
    ? ['SF-Launcher-Release', 'Project-Zero-releases', 'Project-Zero-Release']
    : ['Project-Zero-Release', 'Project-Zero-releases'];
  for (const repository of repositories) {
    for (const file of manifestFiles) {
      add(`https://raw.githubusercontent.com/kucha-5/${repository}/main/${file}`);
      add(`https://github.com/kucha-5/${repository}/raw/refs/heads/main/${file}`);
      add(`https://kucha-5.github.io/${repository}/${file}`);
      add(`https://cdn.jsdelivr.net/gh/kucha-5/${repository}@main/${file}`);
    }
  }
  return urls;
}

function normalizeManifest(data) {
  const manifest = data && typeof data === 'object' ? { ...data } : {};
  manifest.latestVersion = String(manifest.latestVersion || manifest.version || '').trim();
  manifest.downloadUrl = String(manifest.downloadUrl || manifest.downloadURL || manifest.assetUrl || '').trim();
  manifest.sha256 = String(manifest.sha256 || manifest.checksum || '').trim();
  manifest.parts = Array.isArray(manifest.parts) ? manifest.parts.map((part, index) => ({
    url: String(part?.url || part?.downloadUrl || '').trim(),
    sha256: String(part?.sha256 || '').trim(),
    size: Number(part?.size) || 0,
    index
  })).filter(part => part.url) : [];
  if (!manifest.downloadUrl && manifest.parts.length) manifest.downloadUrl = manifest.parts[0].url;
  manifest.mandatory = Boolean(manifest.mandatory ?? manifest.forceUpdate ?? false);
  manifest.updateLogZh = Array.isArray(manifest.updateLogZh)
    ? manifest.updateLogZh
    : (Array.isArray(manifest.changelogZh) ? manifest.changelogZh : []);
  manifest.updateLogEn = Array.isArray(manifest.updateLogEn)
    ? manifest.updateLogEn
    : (Array.isArray(manifest.changelogEn) ? manifest.changelogEn : []);
  manifest.updateLog = Array.isArray(manifest.updateLog)
    ? manifest.updateLog
    : (Array.isArray(manifest.changelog) ? manifest.changelog : []);
  return manifest;
}

async function fetchManifest(configuredUrl, kind) {
  const errors = [];
  for (const url of manifestUrlCandidates(configuredUrl, kind)) {
    try {
      const data = normalizeManifest(await fetchJsonNoCache(url));
      if (!data.latestVersion || !data.downloadUrl) throw new Error('缺少 latestVersion 或 downloadUrl');
      return { data, sourceUrl: url };
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  startupLog(`${kind} manifest unavailable`, errors.join('\n'));
  throw new Error(`无法读取${kind === 'game' ? '游戏' : '启动器'}版本清单：${errors.join(' | ')}`);
}

function isAllowedReleaseDownload(downloadUrl) {
  try {
    const channel = readReleaseChannel();
    const parsed = new URL(downloadUrl);
    if (parsed.protocol !== 'https:') return false;
    if (!channel.allowedDownloadHosts.includes(parsed.hostname.toLowerCase())) return false;
    return !channel.allowedDownloadPathPrefixes.length
      || channel.allowedDownloadPathPrefixes.some(prefix => parsed.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

function findGameFolder(startDir) {
  const queue = [{ dir: startDir, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (validateGameFolder(dir).ok) return dir;
    if (depth >= 6) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
    }
  }
  return null;
}

function findGamePatchFolder(startDir) {
  const queue = [{ dir: startDir, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    if (fs.existsSync(path.join(dir, 'version.json'))) return dir;
    if (depth >= 6) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) queue.push({ dir: path.join(dir, entry.name), depth: depth + 1 });
    }
  }
  return null;
}

function createLauncherWindow() {
  launcherWindow = new BrowserWindow({
    width: 1160,
    height: 700,
    minWidth: 1160,
    minHeight: 700,
    maxWidth: 1160,
    maxHeight: 700,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    title: 'SF Launcher',
    autoHideMenuBar: true,
    backgroundColor: '#090d16',
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  launcherWindow.removeMenu();
  launcherWindow.loadFile(path.join(__dirname, 'launcher.html')).catch((error) => {
    console.error('[Launcher] UI load failed:', error);
  });

  launcherWindow.on('close', (event) => {
    const settings = readSettings();
    if (settings.closeToTray && !app.isQuitting) {
      event.preventDefault();
      launcherWindow.hide();
    }
  });
}

function createTray() {
  try {
    tray = new Tray(trayIcon);
  } catch {
    return;
  }
  updateTrayMenu();
  tray.on('double-click', () => { if (launcherWindow) launcherWindow.show(); });
}

function updateTrayMenu() {
  if (!tray) return;
  const english = readSettings().language === 'en-US';
  const menu = Menu.buildFromTemplate([
    { label: english ? 'Open Launcher' : '打开启动器', click: () => { if (launcherWindow) launcherWindow.show(); } },
    { label: english ? 'Start Game' : '开始游戏', click: () => startGame() },
    { type: 'separator' },
    { label: english ? 'Exit' : '退出', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('SF Launcher');
  tray.setContextMenu(menu);
}

function startGame() {
  if (updateInProgress) return { ok: false, error: '游戏正在更新，请等待更新完成。' };
  try {
    ensureInstalledGame();
  } catch (error) {
    startupLog('Game preparation failed', error);
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.show();
      launcherWindow.webContents.send('launcher-status', {
        type: 'error',
        message: `游戏准备失败：${error.message}`
      });
    }
    return { ok: false, error: `游戏准备失败：${error.message}` };
  }
  if (!fs.existsSync(gameEntry)) {
    if (launcherWindow) launcherWindow.webContents.send('launcher-status', { type: 'error', message: 'Game/index.html not found.' });
    return { ok: false, error: 'Game/index.html not found.' };
  }

  const settings = readSettings();
  if (settings.hideLauncherOnPlay && launcherWindow) launcherWindow.hide();

  if (gameWindow && !gameWindow.isDestroyed()) {
    gameWindow.focus();
    return { ok: true };
  }

  gameWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: 'Project Zero',
    autoHideMenuBar: true,
    backgroundColor: '#05070c',
    icon: ensureProjectZeroIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });
  gameWindow.removeMenu();
  let launchFailed = false;
  const restoreLauncherAfterFailure = (message) => {
    if (launchFailed) return;
    launchFailed = true;
    if (launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.show();
      launcherWindow.focus();
      launcherWindow.webContents.send('launcher-status', { type: 'error', message });
    }
  };
  gameWindow.webContents.once('did-fail-load', (_event, code, description) => {
    restoreLauncherAfterFailure(`游戏加载失败 (${code})：${description}`);
  });
  gameWindow.webContents.on('render-process-gone', (_event, details) => {
    restoreLauncherAfterFailure(`游戏进程异常退出：${details.reason}`);
  });
  gameWindow.loadFile(gameEntry, {
    query: {
      launcherLanguage: settings.language === 'en-US' ? 'en' : 'zh',
      accountApiUrl: settings.accountApiUrl || defaultSettings.accountApiUrl,
      pzBuild: bundledGameInfoFrom(gameDir).build || String(Date.now())
    }
  }).catch((error) => {
    restoreLauncherAfterFailure(`游戏启动失败：${error.message}`);
    if (gameWindow && !gameWindow.isDestroyed()) gameWindow.close();
  });

  gameWindow.on('closed', () => {
    gameWindow = null;
    if (readSettings().returnToLauncher && launcherWindow && !launcherWindow.isDestroyed()) {
      launcherWindow.show();
      launcherWindow.webContents.send('launcher-status', { type: 'ready', message: 'Game closed. Launcher ready.' });
    }
  });

  return { ok: true };
}

function openExecutorTool() {
  if (!fs.existsSync(showcaseEntry)) return { ok:false, error:'角色测试工具文件缺失。' };
  if (showcaseWindow && !showcaseWindow.isDestroyed()) { showcaseWindow.show(); showcaseWindow.focus(); return { ok:true }; }
  showcaseWindow = new BrowserWindow({
    width:1280,height:760,minWidth:960,minHeight:600,title:'Project Zero · 角色测试工具',
    autoHideMenuBar:true,backgroundColor:'#050814',icon:ensureProjectZeroIcon(),
    webPreferences:{contextIsolation:true,nodeIntegration:false}
  });
  showcaseWindow.removeMenu();
  showcaseWindow.loadFile(showcaseEntry).catch(error => startupLog('Executor tool load failed', error));
  showcaseWindow.on('closed',()=>{showcaseWindow=null;});
  return { ok:true };
}

async function fetchJsonNoCache(url) {
  const separator = url.includes('?') ? '&' : '?';
  const response = await requestWithRetry(`${url}${separator}_=${Date.now()}`, {
    cache: 'no-store', headers: { Accept: 'application/json', 'User-Agent': `SF-Launcher/${app.getVersion()}` }
  }, 20000);
  return parseManifestText(await response.text());
}

function shouldRetryHttp(status) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

async function requestWithRetry(url, options = {}, timeoutMs = 30000) {
  let lastError;
  for (let attempt = 0; attempt < NETWORK_RETRY_DELAYS.length; attempt += 1) {
    if (NETWORK_RETRY_DELAYS[attempt]) await wait(NETWORK_RETRY_DELAYS[attempt]);
    try {
      const response = await requestUsingAvailableTransports(url, options, timeoutMs);
      if (response.ok) return response;
      const error = new Error(`HTTP ${response.status} ${response.statusText || ''}`.trim());
      error.retryable = shouldRetryHttp(response.status);
      if (!error.retryable || attempt === NETWORK_RETRY_DELAYS.length - 1) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      if (attempt === NETWORK_RETRY_DELAYS.length - 1 || error?.retryable === false) break;
    }
  }
  throw new Error(`网络请求失败（已重试 ${NETWORK_RETRY_DELAYS.length} 次）：${lastError?.message || '未知错误'}`);
}

async function requestUsingTransport(transportName, transport, url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await transport(url, {
      redirect: 'follow',
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    const reason = error?.name === 'AbortError'
      ? `${transportName} 请求超时`
      : `${transportName}: ${error?.message || String(error)}`;
    throw new Error(reason);
  } finally {
    clearTimeout(timeout);
  }
}

async function requestUsingAvailableTransports(url, options, timeoutMs) {
  const failures = [];

  // Electron uses Chromium's network service and therefore follows the same
  // Windows proxy and certificate configuration as the launcher window.
  if (net && typeof net.fetch === 'function') {
    try {
      return await requestUsingTransport(
        'Electron 网络',
        net.fetch.bind(net),
        url,
        options,
        timeoutMs
      );
    } catch (error) {
      failures.push(error.message);
      startupLog(`Electron network failed for ${url}; falling back to Node fetch`, error);
    }
  }

  if (typeof globalThis.fetch === 'function') {
    try {
      return await requestUsingTransport(
        'Node 网络',
        globalThis.fetch.bind(globalThis),
        url,
        options,
        timeoutMs
      );
    } catch (error) {
      failures.push(error.message);
    }
  }

  throw new Error(failures.join(' | ') || '当前运行环境没有可用的网络请求接口');
}

async function downloadResponse(downloadUrl, accept, timeoutMs) {
  // Release asset URLs must remain byte-for-byte identical so GitHub can
  // complete its signed redirect to the object storage endpoint.
  return requestWithRetry(downloadUrl, {
    headers: { Accept: accept, 'User-Agent': `SF-Launcher/${app.getVersion()}` }
  }, timeoutMs);
}

async function downloadFile(downloadUrl, targetPath, options = {}) {
  const response = await downloadResponse(
    downloadUrl,
    options.accept || 'application/octet-stream',
    options.timeoutMs || 1800000
  );
  if (!response.body) throw new Error('下载响应中没有文件内容。');
  const declaredTotal = Number(response.headers.get('content-length')) || 0;
  const maxBytes = Number(options.maxBytes) || MAX_LAUNCHER_UPDATE_BYTES;
  if (declaredTotal > maxBytes) throw new Error('更新包超过允许的最大体积。');
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const writer = fs.createWriteStream(targetPath);
  const reader = response.body.getReader();
  const hash = crypto.createHash('sha256');
  let downloaded = 0;
  let writerError = null;
  writer.on('error', error => { writerError = error; });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      downloaded += chunk.length;
      if (downloaded > maxBytes) throw new Error('更新包超过允许的最大体积。');
      hash.update(chunk);
      if (!writer.write(chunk)) await new Promise((resolve, reject) => {
        const onDrain = () => { writer.off('error', onError); resolve(); };
        const onError = error => { writer.off('drain', onDrain); reject(error); };
        writer.once('drain', onDrain);
        writer.once('error', onError);
      });
      if (writerError) throw writerError;
      if (typeof options.onProgress === 'function') options.onProgress(downloaded, declaredTotal);
    }
    await new Promise((resolve, reject) => {
      writer.once('error', reject);
      writer.end(resolve);
    });
  } catch (error) {
    writer.destroy();
    throw error;
  }
  if (downloaded < 1024) throw new Error('下载文件异常，体积过小。');
  return { downloaded, total: declaredTotal, sha256: hash.digest('hex') };
}

function psLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function createProjectZeroShortcut() {
  if (process.platform !== 'win32') return { ok: true, skipped: true };
  const desktop = app.getPath('desktop');
  const shortcutPath = path.join(desktop, 'Project Zero.lnk');
  const details = {
    target: launcherExecutable,
    args: '--play',
    cwd: path.dirname(launcherExecutable),
    description: 'Launch Project Zero with SF Launcher',
    icon: ensureProjectZeroIcon(),
    iconIndex: 0
  };
  const operation = fs.existsSync(shortcutPath) ? 'replace' : 'create';
  const ok = shell.writeShortcutLink(shortcutPath, operation, details);
  return ok ? { ok: true, path: shortcutPath } : { ok: false, error: '无法创建桌面快捷方式。' };
}

ipcMain.handle('pz:getState', async () => {
  let initializationWarning = '';
  try {
    ensureInstalledGame();
    ensureProjectZeroIcon();
  } catch (error) {
    initializationWarning = error.message || String(error);
    startupLog('Launcher initialization warning', error);
  }
  const settings = readSettings();
  const installedInfo = bundledGameInfoFrom(gameDir);
  const gameInstalled = validateGameFolder(gameDir).ok;
  return {
    initialized: true,
    initializationWarning,
    gameInstalled,
    currentVersion: gameInstalled ? (installedInfo.version || settings.installedVersion || bundledGameInfo().version || '0.0.0') : '0.0.0',
    currentBuild: gameInstalled ? String(installedInfo.build || '') : '',
    launcherVersion: app.getVersion(),
    launcherBuild,
    validation: validateGameFolder(gameDir, canVerifyAgainstBundled()),
    settings
  };
});

ipcMain.handle('pz:createShortcut', async () => createProjectZeroShortcut());

ipcMain.handle('pz:checkLauncherUpdate', async () => {
  try {
    const channel = readReleaseChannel();
    const result = await fetchManifest(channel.launcherManifestUrl, 'launcher');
    const data = result.data;
    return {
      ok: true,
      data,
      sourceUrl: result.sourceUrl,
      currentVersion: app.getVersion(),
      currentBuild: launcherBuild,
      hasUpdate: isLauncherUpdateAvailable({
        remoteVersion: data.latestVersion,
        remoteBuild: data.build,
        currentVersion: app.getVersion(),
        currentBuild: launcherBuild
      })
    };
  } catch (error) {
    return {
      ok: true,
      offline: true,
      data: {
        offline: true,
        latestVersion: app.getVersion(),
        build: launcherBuild,
        downloadUrl: '',
        updateLogZh: ['离线状态：继续使用当前启动器。'],
        updateLogEn: ['Offline: continuing with the installed launcher.']
      },
      currentVersion: app.getVersion(),
      currentBuild: launcherBuild,
      hasUpdate: false,
      warning: error.message
    };
  }
});

ipcMain.handle('pz:installLauncherUpdate', async (_event, update) => {
  if (updateInProgress) return { ok: false, error: '已有更新任务正在进行。' };
  const downloadUrl = String(update?.downloadUrl || '');
  if (!isAllowedReleaseDownload(downloadUrl)) {
    return { ok: false, error: '启动器更新地址无效。' };
  }
  if (process.platform !== 'win32') return { ok: false, error: '启动器自更新仅支持 Windows 正式包。' };
  const assetType = classifyUpdateAsset(downloadUrl);
  if (!['setup', 'exe', 'zip', 'asar'].includes(assetType)) {
    return { ok: false, error: '启动器更新必须是 app.asar、Setup.exe、便携 EXE 或完整 ZIP。' };
  }
  const jobDir = path.join(app.getPath('userData'), 'launcher-update');
  const payloadPath = path.join(jobDir, assetType === 'zip' ? 'launcher-update.zip' : assetType === 'asar' ? 'launcher-update.asar' : 'launcher-update.exe');
  const extractDir = path.join(jobDir, 'extracted');
  updateInProgress = true;
  try {
    removeDirectorySafe(jobDir);
    fs.mkdirSync(jobDir, { recursive: true });
    sendProgress('Downloading launcher...', 5);
    const transfer = await downloadFile(downloadUrl, payloadPath, {
      accept: assetType === 'zip' ? 'application/zip, application/octet-stream' : 'application/octet-stream',
      maxBytes: MAX_LAUNCHER_UPDATE_BYTES,
      onProgress(downloaded, total) {
        sendProgress('Downloading launcher...', total ? 5 + downloaded / total * 70 : 35, downloaded, total);
      }
    });
    if (update.sha256) {
      if (transfer.sha256.toLowerCase() !== String(update.sha256).toLowerCase()) {
        throw new Error('启动器更新包 SHA-256 校验失败。');
      }
    }

    const signature = fs.readFileSync(payloadPath).subarray(0, 4);
    if (assetType === 'setup' || assetType === 'exe') {
      if (signature[0] !== 0x4d || signature[1] !== 0x5a) throw new Error('下载内容不是有效的 Windows EXE。');
    } else if (assetType === 'zip' && (signature[0] !== 0x50 || signature[1] !== 0x4b)) {
      throw new Error('下载内容不是有效的 ZIP 启动器包。');
    } else if (assetType === 'asar') {
      const header = fs.readFileSync(payloadPath).subarray(0, 262144).toString('utf8');
      if (!header.includes('package.json') || !header.includes('main.js')) throw new Error('下载内容不是有效的启动器 app.asar。');
    }

    if (assetType === 'setup') {
      const target = launcherExecutable;
      if (!target.toLowerCase().endsWith('.exe')) throw new Error('当前不是可更新的正式启动器。');
      const handoffScriptPath = path.join(jobDir, 'install-launcher-update.ps1');
      const handoffLogPath = path.join(jobDir, 'install-launcher-update.log');
      const handoffLines = [
        '$ErrorActionPreference="Stop"',
        `$LogPath=${psLiteral(handoffLogPath)}`,
        `$Target=${psLiteral(target)}`,
        'try {',
        `  Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
        `  $Installer=Start-Process -FilePath ${psLiteral(payloadPath)} -ArgumentList '/S' -Wait -PassThru`,
        '  if ($Installer.ExitCode -ne 0) { throw "Installer exited with code $($Installer.ExitCode)" }',
        '  $Ready=$false',
        '  for ($Attempt=0; $Attempt -lt 40; $Attempt++) {',
        '    if (Test-Path -LiteralPath $Target) { $Ready=$true; break }',
        '    Start-Sleep -Milliseconds 250',
        '  }',
        '  if (-not $Ready) { throw "Updated launcher executable was not found: $Target" }',
        "  Start-Process -FilePath $Target -ArgumentList '--post-update'",
        '  "SUCCESS $(Get-Date -Format o)" | Set-Content -LiteralPath $LogPath -Encoding UTF8',
        '} catch {',
        '  "FAILED $(Get-Date -Format o)`r`n$($_ | Out-String)" | Set-Content -LiteralPath $LogPath -Encoding UTF8',
        '  try { Start-Process -FilePath $Target -ArgumentList \'--post-update\' } catch {}',
        '  exit 1',
        '}'
      ];
      fs.writeFileSync(handoffScriptPath, handoffLines.join('\r\n'), 'utf8');
      sendProgress('Starting installer...', 100, transfer.downloaded, transfer.total);
      const handoff = spawn('powershell.exe', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
        '-File', handoffScriptPath
      ], {
        detached: true,
        windowsHide: true,
        stdio: 'ignore'
      });
      await new Promise((resolve, reject) => {
        handoff.once('spawn', resolve);
        handoff.once('error', reject);
      });
      handoff.unref();
      setTimeout(() => { app.isQuitting = true; app.quit(); }, 900);
      return { ok: true, installerStarted: true, handoffScheduled: true };
    }

    const target = launcherExecutable;
    if (!target.toLowerCase().endsWith('.exe')) throw new Error('当前不是可更新的正式启动器。');
    if (assetType === 'asar') {
      const appAsarTarget = path.join(process.resourcesPath, 'app.asar');
      const appAsarBackup = path.join(jobDir, 'app.asar.backup');
      const scriptPath = path.join(jobDir, 'apply-launcher-asar-update.ps1');
      const scriptLines = [
        '$ErrorActionPreference="Stop"',
        `Wait-Process -Id ${process.pid} -ErrorAction SilentlyContinue`,
        `Copy-Item -LiteralPath ${psLiteral(appAsarTarget)} -Destination ${psLiteral(appAsarBackup)} -Force`,
        'try {',
        `  Copy-Item -LiteralPath ${psLiteral(payloadPath)} -Destination ${psLiteral(appAsarTarget)} -Force`,
        `  Start-Process -FilePath ${psLiteral(target)} -ArgumentList '--post-update'`,
        '} catch {',
        `  Copy-Item -LiteralPath ${psLiteral(appAsarBackup)} -Destination ${psLiteral(appAsarTarget)} -Force`,
        `  Start-Process -FilePath ${psLiteral(target)} -ArgumentList '--post-update'`,
        '  exit 1',
        '}'
      ];
      fs.writeFileSync(scriptPath, scriptLines.join('\r\n'), 'utf8');
      sendProgress('Installing launcher...', 96, transfer.downloaded, transfer.total);
      const handoff = spawn('powershell.exe', ['-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',scriptPath], {detached:true,windowsHide:true,stdio:'ignore'});
      await new Promise((resolve,reject)=>{handoff.once('spawn',resolve);handoff.once('error',reject);});
      handoff.unref();
      setTimeout(() => { app.isQuitting = true; app.quit(); }, 500);
      return { ok: true, scheduled: true, assetType };
    }
    let scriptLines;
    if (assetType === 'zip') {
      sendProgress('Extracting launcher...', 80, transfer.downloaded, transfer.total);
      fs.mkdirSync(extractDir, { recursive: true });
      await runPowerShell(`Expand-Archive -LiteralPath ${psLiteral(payloadPath)} -DestinationPath ${psLiteral(extractDir)} -Force`);
      const runtime = findLauncherRuntime(extractDir);
      if (!runtime) throw new Error('启动器 ZIP 中没有找到完整的 Electron 运行环境。');
      const targetDir = path.dirname(target);
      scriptLines = [
        '$ErrorActionPreference="Stop"',
        `Wait-Process -Id ${process.pid}`,
        `Copy-Item -Path (Join-Path ${psLiteral(runtime.dir)} '*') -Destination ${psLiteral(targetDir)} -Recurse -Force`,
        `Copy-Item -LiteralPath ${psLiteral(runtime.exe)} -Destination ${psLiteral(target)} -Force`,
        `Start-Process -FilePath ${psLiteral(target)} -ArgumentList '--post-update'`
      ];
    } else {
      scriptLines = [
        '$ErrorActionPreference="Stop"',
        `Wait-Process -Id ${process.pid}`,
        `Copy-Item -LiteralPath ${psLiteral(payloadPath)} -Destination ${psLiteral(target)} -Force`,
        `Start-Process -FilePath ${psLiteral(target)} -ArgumentList '--post-update'`
      ];
    }
    const scriptPath = path.join(jobDir, 'apply-launcher-update.ps1');
    fs.writeFileSync(scriptPath, scriptLines.join(';\r\n'), 'utf8');
    sendProgress('Installing launcher...', 96, transfer.downloaded, transfer.total);
    spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath], {
      detached: true,
      windowsHide: true,
      stdio: 'ignore'
    }).unref();
    setTimeout(() => { app.isQuitting = true; app.quit(); }, 300);
    return { ok: true, scheduled: true, assetType };
  } catch (error) {
    startupLog('Launcher update failed', error);
    return { ok: false, error: error.message };
  } finally {
    updateInProgress = false;
  }
});

ipcMain.handle('pz:startGame', async () => startGame());
ipcMain.handle('pz:openExecutorTool', async () => openExecutorTool());
ipcMain.handle('pz:openPaymentLink', async (_event, rawUrl) => {
  const url = String(rawUrl || '').trim();
  if (!STRIPE_PAYMENT_LINKS.has(url)) return { ok:false, error:'付款链接未通过安全校验。' };
  await shell.openExternal(url);
  return { ok:true };
});

ipcMain.handle('pz:requestGameExit', async () => {
  if (gameWindow && !gameWindow.isDestroyed()) {
    gameWindow.close();
    return { ok: true };
  }
  if (readSettings().returnToLauncher && launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.show();
    launcherWindow.focus();
  }
  return { ok: true };
});

ipcMain.handle('pz:openGameFolder', async () => {
  const error = await shell.openPath(gameDir);
  return error ? { ok: false, error } : { ok: true };
});

ipcMain.handle('pz:openLogsFolder', async () => {
  const error = await shell.openPath(app.getPath('userData'));
  return error ? { ok: false, error } : { ok: true };
});

ipcMain.handle('pz:verifyGame', async () => {
  return validateGameFolder(gameDir, canVerifyAgainstBundled());
});

ipcMain.handle('pz:repairGame', async () => {
  const compareWithBundled = canVerifyAgainstBundled();
  const before = validateGameFolder(gameDir, compareWithBundled);
  if (before.ok) return { ok: true, repaired: [] };
  const repaired=[];
  const repairBackup=path.join(app.getPath('userData'),'repair-backup');
  removeDirectorySafe(repairBackup);
  try {
    for(const relativePath of [...before.missing,...before.corrupt]){
      const source=path.join(bundledGameDir,relativePath);
      const target=path.join(gameDir,relativePath);
      if(!fs.existsSync(source)||!fs.statSync(source).isFile()) continue;
      if(fs.existsSync(target)){
        const backup=path.join(repairBackup,relativePath);
        fs.mkdirSync(path.dirname(backup),{recursive:true});
        fs.copyFileSync(target,backup);
      }
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(source,target);
      repaired.push(relativePath);
    }
  } catch(error) {
    for(const relativePath of repaired){
      const backup=path.join(repairBackup,relativePath);
      const target=path.join(gameDir,relativePath);
      if(fs.existsSync(backup)){
        fs.mkdirSync(path.dirname(target),{recursive:true});
        fs.copyFileSync(backup,target);
      }
    }
    removeDirectorySafe(repairBackup);
    return {ok:false,error:`修复过程中出现错误，原文件已恢复：${error.message}`,repaired:[]};
  }
  const after=validateGameFolder(gameDir,true);
  removeDirectorySafe(repairBackup);
  return {
    ok:after.ok,
    redownloadRequired:!after.ok,
    error:after.ok?'':`内置修复后仍缺少文件：${[...after.missing,...after.corrupt].join(', ')}`,
    missing:after.missing,
    corrupt:after.corrupt,
    repaired
  };
});

ipcMain.handle('pz:getSettings', async () => readSettings());
ipcMain.handle('pz:setSettings', async (_event, patch) => {
  const settings = writeSettings(sanitizeUserSettingsPatch(patch));
  updateTrayMenu();
  return settings;
});

ipcMain.handle('pz:checkUpdate', async () => {
  try {
    const channel = readReleaseChannel();
    const result = await fetchManifest(channel.gameManifestUrl, 'game');
    return { ok: true, data: result.data, sourceUrl: result.sourceUrl };
  } catch (err) {
    const bundled = bundledGameInfo();
    return {
      ok: true,
      offline: true,
      data: {
        offline: true,
        latestVersion: bundled.version || '0.0.0',
        version: bundled.version || '0.0.0',
        build: bundled.build || '',
        downloadUrl: '',
        updateLogZh: ['离线状态：可继续运行已安装游戏。'],
        updateLogEn: ['Offline: the installed game remains available.']
      },
      warning: err.message
    };
  }
});

ipcMain.handle('pz:installUpdate', async (_event, update) => {
  if (updateInProgress) return { ok: false, error: '已有更新任务正在进行。' };
  if (gameWindow && !gameWindow.isDestroyed()) return { ok: false, error: '请先退出游戏，再进行更新。' };
  const downloadUrl = String(update?.downloadUrl || '');
  const latestVersion = String(update?.latestVersion || '');
  const latestBuild = String(update?.build || '').trim();
  const isPatch = update?.patch === true || String(update?.packageType || '').toLowerCase() === 'patch';
  const parts = Array.isArray(update?.parts) ? update.parts.map((part, index) => ({
    url: String(part?.url || part?.downloadUrl || '').trim(),
    sha256: String(part?.sha256 || '').trim(),
    size: Number(part?.size) || 0,
    index
  })).filter(part => part.url) : [];
  if (!isAllowedReleaseDownload(downloadUrl) || parts.some(part => !isAllowedReleaseDownload(part.url))) {
    return { ok: false, error: '更新下载地址无效' };
  }
  const jobDir = path.join(app.getPath('userData'), 'update-temp');
  const zipPath = path.join(jobDir, 'update.zip');
  const extractDir = path.join(jobDir, 'extracted');
  const installDir = path.join(app.getPath('userData'), 'Game.installing');
  const backupDir = path.join(app.getPath('userData'), 'Game.backup');
  let writer = null;
  updateInProgress = true;
  try {
    fs.rmSync(jobDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });
    const downloadParts = parts.length ? parts : [{ url: downloadUrl, sha256: '', size: Number(update?.size) || 0, index: 0 }];
    const total = downloadParts.reduce((sum, part) => sum + part.size, 0);
    let downloaded = 0;
    fs.writeFileSync(zipPath, Buffer.alloc(0));
    for (const part of downloadParts) {
      const partPath = path.join(jobDir, `update.part${String(part.index + 1).padStart(3, '0')}`);
      const transfer = await downloadFile(part.url, partPath, {
        accept: 'application/octet-stream',
        timeoutMs: 1800000,
        maxBytes: 25 * 1024 * 1024,
        onProgress(partDownloaded) {
          const current = downloaded + partDownloaded;
          sendProgress(`Downloading part ${part.index + 1}/${downloadParts.length}...`, total ? current / total * 75 : 25, current, total);
        }
      });
      if (part.sha256 && transfer.sha256.toLowerCase() !== part.sha256.toLowerCase()) {
        throw new Error(`更新分包 ${part.index + 1} 校验失败`);
      }
      fs.appendFileSync(zipPath, fs.readFileSync(partPath));
      downloaded += transfer.downloaded;
      fs.rmSync(partPath, { force: true });
    }
    if (downloaded < 1024) throw new Error('下载文件异常，体积过小');
    const signature = fs.readFileSync(zipPath).subarray(0, 4);
    if (signature[0] !== 0x50 || signature[1] !== 0x4b) throw new Error('下载内容不是有效的 ZIP 游戏包，请检查 Release 下载地址。');
    const actualHash = fileSha256(zipPath);
    if (update.sha256 && actualHash.toLowerCase() !== String(update.sha256).toLowerCase()) throw new Error('更新文件校验失败');
    sendProgress('Extracting...', 82, downloaded, total);
    const command = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`;
    await runPowerShell(command);
    const newGameDir = isPatch ? findGamePatchFolder(extractDir) : findGameFolder(extractDir);
    if (!newGameDir) throw new Error('更新包中没有找到有效的 Game 文件夹');
    if (!isPatch) {
      const candidateValidation = validateGameFolder(newGameDir);
      if (!candidateValidation.ok) throw new Error(`更新包缺少运行文件：${candidateValidation.missing.join(', ')}`);
    } else {
      const currentValidation = validateGameFolder(gameDir);
      if (!currentValidation.ok) throw new Error(`当前游戏不完整，无法应用增量包：${currentValidation.missing.join(', ')}`);
    }
    const candidateVersion = bundledGameInfoFrom(newGameDir);
    if (!candidateVersion.version) throw new Error('更新包中的 version.json 无效');
    if (latestVersion && compareVersion(candidateVersion.version, latestVersion) !== 0) {
      throw new Error(`更新包版本不匹配：需要 ${latestVersion}，实际 ${candidateVersion.version}`);
    }
    if (latestBuild && candidateVersion.build !== latestBuild) {
      throw new Error(`更新包构建不匹配：需要 ${latestBuild}，实际 ${candidateVersion.build || '未知'}`);
    }
    sendProgress('Installing...', 90, downloaded, total);
    // Build and validate the complete next runtime before touching the current
    // working game. This keeps a playable copy available after every failed
    // download, extraction, copy or validation attempt.
    removeDirectorySafe(installDir);
    if (isPatch) copyDirectoryTree(gameDir, installDir);
    copyDirectoryTree(newGameDir, installDir);
    const stagedValidation = validateGameFolder(installDir);
    if (!stagedValidation.ok) {
      throw new Error(`安装暂存区缺少运行文件：${stagedValidation.missing.join(', ')}`);
    }
    const stagedVersion = bundledGameInfoFrom(installDir);
    if (stagedVersion.version !== candidateVersion.version || stagedVersion.build !== candidateVersion.build) {
      throw new Error('安装暂存区版本校验失败');
    }
    sendProgress('Installing...', 96, downloaded, total);
    fs.rmSync(backupDir, { recursive: true, force: true });
    if (fs.existsSync(gameDir)) fs.renameSync(gameDir, backupDir);
    try {
      fs.renameSync(installDir, gameDir);
      const installedValidation = validateGameFolder(gameDir);
      if (!installedValidation.ok) throw new Error(`安装后缺少运行文件：${installedValidation.missing.join(', ')}`);
      writeSettings({
        installedVersion: candidateVersion.version || latestVersion,
        bundledBuildInstalled: `online:${candidateVersion.build || latestBuild || 'unknown'}`
      });
      fs.rmSync(backupDir, { recursive: true, force: true });
    } catch (installError) {
      fs.rmSync(gameDir, { recursive: true, force: true });
      if (fs.existsSync(backupDir)) fs.renameSync(backupDir, gameDir);
      throw installError;
    }
    sendProgress('Ready', 100, downloaded, total);
    return { ok: true, version: candidateVersion.version || latestVersion, build: candidateVersion.build || latestBuild };
  } catch (err) {
    if (writer && !writer.destroyed) writer.destroy();
    return { ok: false, error: err.message };
  } finally {
    updateInProgress = false;
    removeDirectorySafe(installDir);
    try { fs.rmSync(jobDir, { recursive: true, force: true }); }
    catch (cleanupError) { console.warn('[Launcher] update cleanup failed:', cleanupError.message); }
  }
});

const hasSingleInstanceLock = typeof app.requestSingleInstanceLock !== 'function' || app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!launcherWindow || launcherWindow.isDestroyed()) return;
    if (launcherWindow.isMinimized()) launcherWindow.restore();
    launcherWindow.show();
    launcherWindow.focus();
  });
  app.whenReady().then(() => {
    startupLog(`SF Launcher ${app.getVersion()} ready (${process.arch})`);
    app.setAppUserModelId('com.saltfishstudio.sflauncher');
    createLauncherWindow();
    createTray();
    if (process.argv.includes('--post-update')) {
      setTimeout(() => {
        if (launcherWindow && !launcherWindow.isDestroyed()) {
          launcherWindow.webContents.send('launcher-status', {
            type: 'ready',
            message: 'SF Launcher 更新完成。'
          });
        }
      }, 900);
    }
    if (process.argv.includes('--play')) setTimeout(() => startGame(), 700);
  }).catch(showStartupFailure);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
