/**
 * Post-processes `expo export -p web` output into an installable PWA.
 * Run automatically by `npm run build:pwa`. Idempotent.
 *
 * Icons get content-hashed filenames so iOS/Safari can't serve a stale
 * cached icon after the artwork changes.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const pwaAssets = path.join(root, 'pwa-assets');

if (!fs.existsSync(dist)) {
  console.error('dist/ not found — run `expo export -p web` first.');
  process.exit(1);
}

// Version tag derived from the icon contents — changes only when the art does.
const iconBuf = fs.readFileSync(path.join(pwaAssets, 'app-icon-512.png'));
const v = crypto.createHash('md5').update(iconBuf).digest('hex').slice(0, 8);

const icons = {
  appleTouch: `apple-touch-icon.${v}.png`,
  i192: `app-icon-192.${v}.png`,
  i512: `app-icon-512.${v}.png`,
};

// 1. Copy icons into the web root under their hashed names.
fs.copyFileSync(path.join(pwaAssets, 'apple-touch-icon.png'), path.join(dist, icons.appleTouch));
fs.copyFileSync(path.join(pwaAssets, 'app-icon-192.png'), path.join(dist, icons.i192));
fs.copyFileSync(path.join(pwaAssets, 'app-icon-512.png'), path.join(dist, icons.i512));

// 2. Write the web app manifest.
const manifest = {
  name: 'SmileClock',
  short_name: 'SmileClock',
  description: 'Track how long you wear your aligners each day.',
  start_url: '.',
  scope: '.',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F1F6F8',
  theme_color: '#14B8A6',
  icons: [
    { src: icons.i192, sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: icons.i512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};
fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 3. Inject PWA + iOS home-screen tags into <head> (replacing any prior set).
const indexPath = path.join(dist, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const tags = `
    <meta name="theme-color" content="#14B8A6" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="SmileClock" />
    <link rel="apple-touch-icon" href="${icons.appleTouch}" />
    <link rel="manifest" href="manifest.json" />
`;
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', `${tags}  </head>`);
  fs.writeFileSync(indexPath, html);
}

console.log(`✅ PWA ready in dist/ (icon version ${v}).`);
