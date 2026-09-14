import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const image = process.env.IMAGE_TAG || 'posts-showcase:review';
const id = `posts-smoke-${process.pid}-${Date.now()}`;
const web = `${id}-web`;
const upstream = `${id}-upstream`;
const directory = mkdtempSync(join(tmpdir(), 'posts-smoke-'));
const key = 'ci-smoke-test-key';
const openssl =
  process.env.OPENSSL_PATH ||
  (process.platform === 'win32'
    ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe'
    : 'openssl');

function docker(...args) {
  return execFileSync('docker', args, {
    encoding: 'utf8',
    timeout: 120_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function ready(url) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {
      // Запуск контейнера асинхронный: до открытия порта соединение может отклоняться.
    }
    await delay(500);
  }
  throw new Error(`Контейнер не стал доступен: ${url}`);
}

function startWeb(trusted) {
  const mounts = trusted
    ? [
        '--mount',
        `type=bind,source=${join(directory, 'cert.pem')},target=/etc/ssl/certs/ca-certificates.crt,readonly`,
      ]
    : [];
  docker(
    'run',
    '-d',
    '--name',
    web,
    '--network',
    id,
    '--env',
    `GUARDIAN_API_KEY=${key}`,
    '--publish',
    '127.0.0.1::80',
    ...mounts,
    image,
  );
  const port = docker('port', web, '80/tcp').split(':').at(-1);
  return `http://127.0.0.1:${port}`;
}

function securityHeaders(response) {
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(
    response.headers.get('referrer-policy'),
    'strict-origin-when-cross-origin',
  );
}

try {
  try {
    execFileSync(openssl, ['version'], { stdio: 'ignore' });
  } catch {
    throw new Error(
      'Для TLS smoke-теста нужен OpenSSL. Установите его или задайте OPENSSL_PATH (в Windows подходит OpenSSL из Git for Windows).',
    );
  }
  execFileSync(
    openssl,
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-subj',
      '/CN=content.guardianapis.com',
      '-addext',
      'subjectAltName=DNS:content.guardianapis.com',
      '-keyout',
      join(directory, 'key.pem'),
      '-out',
      join(directory, 'cert.pem'),
    ],
    { stdio: 'ignore' },
  );

  if (!process.env.IMAGE_TAG) {
    execFileSync('docker', ['build', '--tag', image, '.'], {
      stdio: 'inherit',
    });
  }

  for (const invalidKey of ['', 'invalid;key']) {
    let exitCode;
    try {
      docker('run', '--rm', '--env', `GUARDIAN_API_KEY=${invalidKey}`, image);
      exitCode = 0;
    } catch (error) {
      exitCode = error.status;
    }
    assert.equal(
      exitCode,
      1,
      'Образ должен отказывать при отсутствующем или некорректном ключе',
    );
  }

  writeFileSync(
    join(directory, 'upstream.cjs'),
    `
const https = require('node:https');
const fs = require('node:fs');
https.createServer({ key: fs.readFileSync('/fixture/key.pem'), cert: fs.readFileSync('/fixture/cert.pem') }, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ url: req.url, headers: req.headers, receivedAt: Date.now() }));
}).listen(443, '0.0.0.0');
`,
  );
  docker('network', 'create', id);
  docker(
    'run',
    '-d',
    '--name',
    upstream,
    '--network',
    id,
    '--network-alias',
    'content.guardianapis.com',
    '--mount',
    `type=bind,source=${directory},target=/fixture,readonly`,
    'node:22-alpine',
    'node',
    '/fixture/upstream.cjs',
  );
  // Дожидаемся TLS listener, чтобы отсутствие доверия не спутать с закрытым портом.
  for (let attempt = 0; ; attempt++) {
    try {
      docker(
        'exec',
        upstream,
        'node',
        '-e',
        "const s=require('net').connect(443,'127.0.0.1',()=>s.end());s.on('error',()=>process.exit(1))",
      );
      break;
    } catch (error) {
      if (attempt === 29) throw error;
      await delay(200);
    }
  }

  let base = startWeb(false);
  await ready(`${base}/healthz`);
  assert.equal(
    (await fetch(`${base}/guardian-api/search`)).status,
    502,
    'Недоверенный TLS-сертификат должен отклоняться',
  );
  docker('rm', '--force', web);

  base = startWeb(true);
  await ready(`${base}/healthz`);
  const config = docker('exec', web, 'nginx', '-T');
  assert.match(config, /proxy_ssl_verify on;/);
  assert.ok(config.includes(`api-key=${key}`));
  const root = await fetch(base);
  securityHeaders(root);
  assert.match(root.headers.get('cache-control'), /no-cache/);
  const html = await root.text();
  assert.ok(html.includes('<div id="root"></div>'));
  const asset = html.match(/\/assets\/[^" ]+\.js/)?.[0];
  assert.ok(asset, 'В HTML должен быть JS asset');
  const assetResponse = await fetch(base + asset);
  assert.equal(assetResponse.status, 200);
  securityHeaders(assetResponse);
  assert.match(assetResponse.headers.get('cache-control'), /immutable/);
  const direct = await fetch(
    `${base}/posts/world%2F2026%2Fsep%2F13%2Fsmoke?page=2&limit=20`,
  );
  assert.equal(
    await direct.text(),
    html,
    'Прямой SPA-маршрут должен возвращать приложение',
  );

  // Сканируем файлы именно запущенного образа; отсутствие assets является ошибкой проверки.
  docker('cp', `${web}:/usr/share/nginx/html`, join(directory, 'html'));
  const assetDirectory = join(directory, 'html', 'assets');
  assert.ok(existsSync(join(directory, 'html', 'index.html')));
  const assets = readdirSync(assetDirectory).filter((file) =>
    /\.(js|css)$/.test(file),
  );
  assert.ok(assets.some((file) => file.endsWith('.js')));
  assert.ok(assets.some((file) => file.endsWith('.css')));
  for (const file of [
    join(directory, 'html', 'index.html'),
    ...assets.map((name) => join(assetDirectory, name)),
  ]) {
    assert.ok(
      !readFileSync(file, 'utf8').includes(key),
      'Runtime-ключ попал в клиентские файлы',
    );
  }

  assert.equal(
    (await fetch(`${base}/guardian-api/search?api-key=attacker`)).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/guardian-api/search`, { method: 'POST' })).status,
    403,
  );
  const proxied = await fetch(
    `${base}/guardian-api/search?page=2&page-size=20&%61pi-key=attacker&show-fields=all`,
    {
      headers: { Authorization: 'Bearer client-value', Cookie: 'client=value' },
    },
  );
  assert.equal(proxied.status, 200);
  const payload = await proxied.json();
  const query = new URL(payload.url, 'https://content.guardianapis.com');
  assert.deepEqual(query.searchParams.getAll('api-key'), [key]);
  assert.equal(query.searchParams.get('page'), '2');
  assert.equal(query.searchParams.get('page-size'), '20');
  assert.equal(
    query.searchParams.get('show-fields'),
    'byline,trailText,thumbnail',
  );
  assert.equal(payload.headers.authorization, undefined);
  assert.equal(payload.headers.cookie, undefined);
  const detail = await fetch(`${base}/guardian-api/world/2026/sep/13/smoke`);
  assert.equal(detail.status, 200);
  const detailUrl = new URL(
    (await detail.json()).url,
    'https://content.guardianapis.com',
  );
  assert.equal(detailUrl.pathname, '/world/2026/sep/13/smoke');
  assert.equal(
    detailUrl.searchParams.get('show-fields'),
    'byline,bodyText,thumbnail',
  );

  const burst = await Promise.all(
    Array.from({ length: 8 }, () => fetch(`${base}/guardian-api/search`)),
  );
  assert.ok(
    burst.some((response) => response.status === 429),
    'Переполнение общей очереди должно возвращать 429',
  );
  const accepted = await Promise.all(
    burst.filter((response) => response.ok).map((response) => response.json()),
  );
  const times = accepted
    .map((response) => response.receivedAt)
    .sort((a, b) => a - b);
  assert.ok(times.length >= 2);
  for (let index = 1; index < times.length; index++)
    assert.ok(
      times[index] - times[index - 1] >= 850,
      'Запросы upstream должны идти с интервалом около секунды',
    );
  console.log(
    'Production smoke: TLS, proxy, runtime secrets, rate limit, SPA routes and headers passed.',
  );
} catch (error) {
  try {
    console.error(docker('logs', web));
  } catch {
    // При ошибке сборки или запуска контейнера логов ещё нет.
  }
  throw error;
} finally {
  for (const name of [web, upstream]) {
    try {
      docker('rm', '--force', name);
    } catch {
      /* Контейнер мог не успеть создаться. */
    }
  }
  try {
    docker('network', 'rm', id);
  } catch {
    /* Сеть могла не успеть создаться. */
  }
  rmSync(directory, { recursive: true, force: true });
}
