import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const gradlePath = resolve('android/app/build.gradle');
let gradle = await readFile(gradlePath, 'utf8');

const signing = process.env.ANDROID_KEYSTORE_PATH
  ? `signingConfigs {
        release {
            storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }`
  : '';

if (signing) {
  gradle = gradle.replace(/android\s*\{/, match => `${match}\n    ${signing}`);
  const releaseBlock = /(buildTypes\s*\{[\s\S]*?\brelease\s*\{)([\s\S]*?)(\n\s*\})/;
  if (!releaseBlock.test(gradle)) throw new Error(`Could not find the Android release build type in ${gradlePath}`);
  gradle = gradle.replace(releaseBlock, (_match, open, body, close) => `${open}${body.replace(/\s*signingConfig\s+signingConfigs\.debug\s*/, '\n')}\n            signingConfig signingConfigs.release${close}`);
  await writeFile(gradlePath, gradle);
  console.log('Configured the stable release signing key supplied by GitHub Actions.');
} else {
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
}
