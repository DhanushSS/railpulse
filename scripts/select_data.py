"""Select a small, auditable set of completed NTES-derived runs."""
import json
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import duckdb

source = Path('data/source/2026-10-25.parquet')
target = Path('data/selected/ntes_2026-10-25_6trains.json')
train_numbers = ['12013', '19483', '22160', '22499', '56615', '68742']
columns = '''train_number, train_name, category, start_date, status, seq,
             station_code, scheduled_arrival, scheduled_departure,
             actual_arrival, actual_departure, arrival_reported,
             departure_reported, arrival_delay_min, departure_delay_min, run_quality'''
rows = duckdb.connect().execute(
    f'''SELECT {columns} FROM read_parquet(?)
        WHERE train_number IN (SELECT unnest(?::VARCHAR[]))
          AND status = 'completed'
        ORDER BY train_number, start_date, seq''',
    [str(source), train_numbers],
).fetchall()
keys = [x.strip() for x in columns.split(',')]
ist = ZoneInfo('Asia/Kolkata')
records = []
for row in rows:
    record = dict(zip(keys, row))
    for key, value in record.items():
        if isinstance(value, datetime):
            record[key] = value.astimezone(ist).strftime('%Y-%m-%d %H:%M:%S')
        elif key == 'start_date':
            record[key] = value.isoformat()
    records.append(record)
runs = {}
for record in records:
    key = (record['train_number'], record['start_date'])
    runs.setdefault(key, []).append(record)
assert len(records) == 258 and len(runs) == 12
for key, run in runs.items():
    assert [r['seq'] for r in run] == list(range(1, len(run) + 1)), key
    assert len(run) >= 8 and run[0]['station_code'] != run[-1]['station_code'], key
    assert min(r['run_quality'] for r in run) >= 0.98, key
    assert all(r['actual_arrival'] or r['actual_departure'] for r in run), key
output = {
    'source_url': 'https://huggingface.co/datasets/pjay-in/indian-railways-delays',
    'source_file': 'data/2026/10/2026-10-25.parquet',
    'source_license': 'CC BY 4.0',
    'selection': 'Six named train services, two completed runs each, run quality at least 0.98',
    'records': records,
}
target.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Wrote {len(records)} stops across {len(runs)} runs to {target}')
