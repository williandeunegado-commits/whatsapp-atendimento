// Mantém o túnel localtunnel ativo com subdomínio fixo
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const localtunnel = require('localtunnel');

const SUBDOMAIN = 'cl-whatsapp-bridge'; // URL FIXA: https://cl-whatsapp-bridge.loca.lt
const PORT = 3001;

async function start() {
  while (true) {
    try {
      const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });
      console.log(`✅ Túnel ativo: ${tunnel.url}`);

      await new Promise((resolve, reject) => {
        tunnel.on('close', resolve);
        tunnel.on('error', reject);
      });

      console.log('⚠️  Túnel fechado. Reconectando em 5s...');
    } catch (err) {
      console.error('Erro no túnel:', err.message, '— tentando novamente em 5s...');
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

start();
