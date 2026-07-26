#!/bin/bash
# OpenStock 每日 Tushare 数据增量同步
# 建议每天 18:30 跑(收盘后 1 小时)
# log: /home/titus/.openstock/logs/sync.log

set -u

LOG=/home/titus/.openstock/logs/sync.log
mkdir -p $(dirname $LOG)

NOW=$(date '+%Y-%m-%d %H:%M:%S')
echo "===== $NOW sync started =====" >> $LOG

cd /mnt/data/code/china_a_stock_data

# 1. 同步 daily + daily_basic(Tushare,2000 积分档已够用)
.venv/bin/python -u << 'PYEOF' >> $LOG 2>&1
import tushare as ts
import os
import sys
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv('/mnt/data/code/china_a_stock_data/.env')
TUSHARE_TOKEN = os.environ.get('TUSHARE_TOKEN')

if not TUSHARE_TOKEN:
    print("ERROR: TUSHARE_TOKEN not set")
    sys.exit(1)

pro = ts.pro_api(TUSHARE_TOKEN)

# 拉最近 5 天的数据(覆盖周末/节假日)
today = datetime.now()
end_dt = today.strftime('%Y%m%d')
start_dt = (today - timedelta(days=7)).strftime('%Y%m%d')

print(f"Syncing daily {start_dt} to {end_dt}...")

try:
    # daily
    df_daily = pro.daily(start_date=start_dt, end_date=end_dt)
    print(f"  daily: {len(df_daily)} rows")
    # daily_basic
    df_basic = pro.daily_basic(start_date=start_dt, end_date=end_dt)
    print(f"  daily_basic: {len(df_basic)} rows")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(2)

print("Done. (导入 PG 需要使用 manage.py 工具,见 china_a_stock_data 项目)")
PYEOF

echo "===== $NOW sync finished =====" >> $LOG
