// Runs after `tsc -p tsconfig.server.json` as part of `npm run build:deploy`.
//
// Turns `server-build/` (the compiled server JS) into a single, self-contained folder that is
// exactly what you upload to a shared host's Node.js App root (e.g. cPanel's "Setup Node.js App"):
//   server-build/
//     package.json   <- slim production manifest (only what the server actually requires at
//                        runtime - none of the frontend build tooling like vite/tailwind/react)
//     server/*.js
//     src/data/mockData.js
//     src/types/index.js
//     dist/          <- copied in from the Vite build, so this one folder serves both the API
//                        and the built frontend (see the static-file block in server/index.ts)
//
// See the "פריסה לשרת (cPanel / אחסון משותף)" section in README.md for the full deployment guide.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const SERVER_BUILD = path.join(ROOT, 'server-build');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(SERVER_BUILD)) {
  console.error('server-build/ not found - did `tsc -p tsconfig.server.json` run first?');
  process.exit(1);
}

// A slim, production-only package.json for the deployed app. Deliberately excludes every
// frontend-only dependency (react, vite, tailwindcss, lucide-react, motion, canvas-confetti,
// @vitejs/plugin-react) - the frontend is already built into static files in dist/, so a
// shared host's constrained "Run NPM Install" only ever has to fetch these six small packages.
const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const SERVER_RUNTIME_DEPS = ['@google/genai', 'bcryptjs', 'cors', 'dotenv', 'express', 'jsonwebtoken'];
const deployPkg = {
  name: 'equipment-lending-server',
  private: true,
  version: '1.0.0',
  type: 'commonjs',
  main: 'server/index.js',
  scripts: {
    start: 'node server/index.js',
    'seed:users': 'node server/seed-users.js',
  },
  dependencies: Object.fromEntries(
    SERVER_RUNTIME_DEPS.map((name) => [name, rootPkg.dependencies[name]])
  ),
};

fs.writeFileSync(path.join(SERVER_BUILD, 'package.json'), JSON.stringify(deployPkg, null, 2) + '\n');

if (fs.existsSync(DIST)) {
  // Deliberately no rm-before-copy here: an old server-build/dist/ can be left with a *stale*,
  // differently-hashed asset file or two from a previous build (harmless dead weight - Vite's
  // fresh index.html only ever references the current build's filenames), but always trying to
  // wipe the folder first is the fragile part - some environments (locked files, restrictive
  // mount permissions) throw EPERM on the delete despite the actual copy working fine. Delete
  // server-build/dist yourself occasionally if you want to clear out old stale assets.
  fs.cpSync(DIST, path.join(SERVER_BUILD, 'dist'), { recursive: true, force: true });
  console.log('Copied dist/ into server-build/dist/');
} else {
  console.warn('dist/ not found - run `npm run build` (or `npm run build:deploy`) first so the frontend is included too.');
}

console.log('\nserver-build/ is ready to upload as your Node.js App root. Contents:');
for (const entry of fs.readdirSync(SERVER_BUILD)) {
  console.log('  -', entry);
}
