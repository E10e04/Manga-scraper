import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'www');
const files = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'sw.js'];

await mkdir(output, { recursive: true });
await Promise.all(files.map(file => copyFile(resolve(root, file), resolve(output, file))));
const packageInfo = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const appPath = resolve(output, 'app.js');
const appSource = await readFile(appPath, 'utf8');
const appVersion = (process.env.MANGA_READER_VERSION || packageInfo.version).replace(/^v/i, '');
await writeFile(appPath, appSource.replace(/const APP_VERSION='[^']+';/, `const APP_VERSION='${appVersion}';`));
await copyFile(resolve(root, 'assets/icon.svg'), resolve(output, 'icon.svg'));
console.log(`Copied ${files.length + 1} app files to www/`);
