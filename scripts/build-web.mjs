import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'www');
const files = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'sw.js'];

await mkdir(output, { recursive: true });
await Promise.all(files.map(file => copyFile(resolve(root, file), resolve(output, file))));
await copyFile(resolve(root, 'assets/icon.svg'), resolve(output, 'icon.svg'));
console.log(`Copied ${files.length + 1} app files to www/`);
