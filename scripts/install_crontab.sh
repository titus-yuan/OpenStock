#!/bin/bash
# OpenStock 每周日全量备份 PG
# log: /home/titus/.openstock/logs/backup.log

set -u

LOG=/home/titus/.openstock/logs/backup.log
mkdir -p $(dirname $LOG) /home/titus/.openstock/backups/pg

NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "===== $NOW backup started =====" >> $LOG

cd /home/titus/.openstock/backups/pg
DATE=$(date +%Y%m%d_%H%M%S)

export PGPASSWORD="${PGPASSWORD:-JB1irqN9qYx2e11wYw5weonv}"

# 完整备份
pg_dump -h 192.168.169.3 -U postgres -d china_stock_a -Fc -f full_${DATE}.dump 2>> $LOG

if [ $? -eq 0 ]; then
    # 压缩
    gzip full_${DATE}.dump 2>> $LOG
    SIZE=$(ls -lh full_${DATE}.dump.gz 2>/dev/null | awk '{print $5}')
    echo "$NOW PG backup OK: full_${DATE}.dump.gz ($SIZE)" >> $LOG
else
    echo "$NOW PG backup FAILED" >> $LOG
fi

# 清理 30 天前的备份
find /home/titus/.openstock/backups/pg -name "full_*.dump.gz" -mtime +30 -delete 2>/dev/null

echo "===== $NOW backup finished =====" >> $LOG
