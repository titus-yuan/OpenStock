module.exports = {
  apps: [{
    name: 'openstock',
    script: 'npm',
    args: 'run start',
    cwd: '/home/titus/OpenStock',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/home/titus/.openstock/logs/error.log',
    out_file: '/home/titus/.openstock/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
    kill_timeout: 5000,
    listen_timeout: 10000,
  }],
};
