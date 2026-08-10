module.exports = {
  apps: [
    {
      name: 'clouddroid',
      script: './dist/server/entry.mjs',
      cwd: '/var/www/clouddroid',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 4321
      },
      error_file: '/var/log/pm2/clouddroid-error.log',
      out_file: '/var/log/pm2/clouddroid-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
