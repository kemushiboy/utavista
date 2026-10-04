/**
 * electron-builder afterPack フック。
 * パッケージ対象の OS / アーキテクチャに合った ffmpeg・ffprobe を Resources/ffmpeg/ へ同梱する。
 *
 * - ffmpeg: ffmpeg-static。ビルド環境と異なる組み合わせは同パッケージの install.js で取得し、
 *   node_modules/.cache/utavista-ffmpeg/<platform>-<arch>/ にキャッシュする。
 * - ffprobe: ffprobe-static に全プラットフォーム分が含まれているものをコピーする。
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FFMPEG_STATIC_DIR = path.join(ROOT, 'node_modules', 'ffmpeg-static');
const FFPROBE_STATIC_DIR = path.join(ROOT, 'node_modules', 'ffprobe-static');
const CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'utavista-ffmpeg');

// electron-builder の Arch enum: 0=ia32, 1=x64, 2=armv7l, 3=arm64, 4=universal
const ARCH_NAMES = { 0: 'ia32', 1: 'x64', 2: 'arm', 3: 'arm64' };

function resolveFFmpeg(platform, arch) {
  const executable = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const hostBinary = path.join(FFMPEG_STATIC_DIR, executable);
  if (platform === os.platform() && arch === os.arch() && fs.existsSync(hostBinary)) {
    return hostBinary;
  }

  const cached = path.join(CACHE_DIR, `${platform}-${arch}`, executable);
  if (!fs.existsSync(cached)) {
    fs.mkdirSync(path.dirname(cached), { recursive: true });
    console.log(`  • downloading ffmpeg for ${platform}-${arch}`);
    execFileSync(process.execPath, [path.join(FFMPEG_STATIC_DIR, 'install.js')], {
      cwd: FFMPEG_STATIC_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        CI: '1',
        FFMPEG_BIN: cached,
        npm_config_platform: platform,
        npm_config_arch: arch
      }
    });
  }
  return cached;
}

function resolveFFprobe(platform, arch) {
  const executable = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  const binary = path.join(FFPROBE_STATIC_DIR, 'bin', platform, arch, executable);
  if (!fs.existsSync(binary)) {
    throw new Error(`ffprobe-static has no binary for ${platform}-${arch}`);
  }
  return binary;
}

function copyExecutable(source, destination) {
  fs.copyFileSync(source, destination);
  fs.chmodSync(destination, 0o755);
}

exports.default = async function bundleFFmpeg(context) {
  const platform = context.electronPlatformName;
  const arch = ARCH_NAMES[context.arch];
  if (!arch) {
    throw new Error(`Unsupported arch for bundled ffmpeg: ${context.arch}`);
  }

  const resourcesDir = platform === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(context.appOutDir, 'resources');
  const targetDir = path.join(resourcesDir, 'ffmpeg');
  fs.mkdirSync(targetDir, { recursive: true });

  const ffmpeg = resolveFFmpeg(platform, arch);
  const ffprobe = resolveFFprobe(platform, arch);
  copyExecutable(ffmpeg, path.join(targetDir, path.basename(ffmpeg)));
  copyExecutable(ffprobe, path.join(targetDir, path.basename(ffprobe)));

  // GPL ビルドのため、ライセンスとソース入手先の情報を同梱する。
  [
    [`${ffmpeg}.LICENSE`, 'ffmpeg.LICENSE'],
    [`${ffmpeg}.README`, 'ffmpeg.README'],
    [path.join(FFPROBE_STATIC_DIR, 'LICENSE'), 'ffprobe-static.LICENSE']
  ].forEach(([source, name]) => {
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(targetDir, name));
  });

  console.log(`  • bundled ffmpeg/ffprobe for ${platform}-${arch} → ${targetDir}`);
};
