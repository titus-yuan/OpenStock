#!/bin/bash
# OpenStock 健康监控
# 每 5 分钟跑一次
# log: /home/titus/.openstock/logs/monitor.log

set -u

LOG=/home/titus/.openstock/logs/monitor.log
mkdir -p $(dirname $LOG)

# 当前时间
NOW=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "$NOW $1" >> $LOG
}

# 1. PM2 next-server 进程
if pgrep -f "next-server" > /dev/null; then
    log "OK next-server is running"
else
    log "ALERT next-server is DOWN"
    # 尝试自动拉起
    pm2 restart openstock >> $LOG 2>&1 || pm2 start /home/titus/OpenStock/ecosystem.config.js >> $LOG 2>&1
fi

# 2. 端口 3001
if ss -tlnp 2>/dev/null | grep -q ":3001 "; then
    log "OK port 3001 is listening"
else
    log "ALERT port 3001 is not listening"
fi

# 3. MongoDB
if pgrep -f mongod > /dev/null; then
    log "OK mongodb is running"
else
    log "WARN mongodb is not running (non-fatal)"
fi

# 4. PG 数据陈旧度
export PGPASSWORD="${PGPASSWORD:-JB1irqN9qYx2e11wYw5weonv}"
LATEST=$(psql -h 192.168.169.3 -U postgres -d china_stock_a -t -A -c "SELECT MAX(trade_date) FROM stock_daily" 2>/dev/null | tr -d ' ')
if [ -n "$LATEST" ]; then
    DAYS=$(( ($(date +%s) - $(date -d "$LATEST" +%s)) / 86400 ))
    if [ $DAYS -gt 2 ]; then
        log "WARN stock_daily latest is $LATEST ($DAYS days ago)"
    else
        log "OK stock_daily latest is $LATEST"
    fi
else
    log "WARN cannot query stock_daily"
fi

# 5. 磁盘空间
DISK=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ $DISK -gt 85 ]; then
    log "ALERT disk usage is ${DISK}%"
elif [ $DISK -gt 70 ]; then
    log "WARN disk usage is ${DISK}%"
else
    log "OK disk usage is ${DISK}%"
fi

# 清理 7 天前的 monitor log
find $(dirname $LOG) -name "monitor.log" -mtime +7 -delete 2>/dev/null
