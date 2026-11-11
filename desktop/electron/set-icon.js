const { rcedit } = require('rcedit');
const path = require('path');

async function setIcon(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(__dirname, '../public/icon.ico');
  console.log('[afterPack] Embedding Fireupp flame icon into:', exePath);
  try {
    await rcedit(exePath, {
      icon: iconPath,
      'version-string': {
        ProductName: 'Fireupp',
        FileDescription: 'Fireupp Native Desktop Client',
        CompanyName: 'Fireupp'
      }
    });
    console.log('[afterPack] Fireupp flame icon successfully applied!');
  } catch (err) {
    console.error('[afterPack] Failed to set icon with rcedit:', err);
  }
}

module.exports = setIcon;
module.exports.default = setIcon;
