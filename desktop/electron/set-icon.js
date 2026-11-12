const { rcedit } = require('rcedit');
const path = require('path');

async function setIcon(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(__dirname, '../public/icon.ico');
  console.log('[afterPack] Embedding Zovio icon into:', exePath);
  try {
    await rcedit(exePath, {
      icon: iconPath,
      'version-string': {
        ProductName: 'Zovio',
        FileDescription: 'Zovio Native Desktop Client',
        CompanyName: 'Zovio'
      }
    });
    console.log('[afterPack] Zovio icon successfully applied!');
  } catch (err) {
    console.error('[afterPack] Failed to set icon with rcedit:', err);
  }
}

module.exports = setIcon;
module.exports.default = setIcon;
