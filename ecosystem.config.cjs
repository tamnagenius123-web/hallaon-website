const fs = require('fs');
const path = require('path');

// .env 파일을 직접 파싱하여 환경변수 로드
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.substring(0, idx).trim();
    let val = trimmed.substring(idx + 1).trim();
    // 외부 따옴표 제거
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const envVars = loadEnv();

module.exports = {
  apps: [
    {
      name: 'hallaon',
      script: 'npx',
      args: 'tsx server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ...envVars,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
};
