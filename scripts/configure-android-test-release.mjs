import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const gradlePath = resolve('android/app/build.gradle');
let gradle = await readFile(gradlePath, 'utf8');

if (gradle.includes('signingConfig signingConfigs.debug')) {
  console.log('Release APK already uses the debug signing key.');
} else {
  const releaseBlock = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{)/;
  if (!releaseBlock.test(gradle)) {
    throw new Error(`Could not find the Android release build type in ${gradlePath}`);
  }
  gradle = gradle.replace(releaseBlock, '$1\n            signingConfig signingConfigs.debug');
  await writeFile(gradlePath, gradle);
  console.log('Configured the release APK with the CI debug signing key for installation testing.');
}
