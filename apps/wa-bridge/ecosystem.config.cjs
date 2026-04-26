module.exports = {
  apps: [
    {
      name: 'wa-bridge',
      script: 'server.mjs',
      cwd: __dirname,
      interpreter: 'node',
      restart_delay: 5000,
      max_restarts: 50,
      watch: false,
      env: { PORT: 3001, NODE_ENV: 'production' },
    },
    {
      name: 'wa-tunnel',
      script: 'tunnel.mjs',
      cwd: __dirname,
      interpreter: 'node',
      restart_delay: 8000,
      max_restarts: 99,
      watch: false,
    },
  ],
};
