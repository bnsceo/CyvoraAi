from pathlib import Path

p = Path('lib/db.ts')
text = p.read_text()

bad_department = """    stmt.run(
      data.company_id,
      data.name,
      data.description || '',
      data.trace_id || newTraceId(),
      new Date().toISOString(),
"""
good_department = """    stmt.run(
      data.company_id,
      data.name,
      data.description || '',
      new Date().toISOString(),
"""
if bad_department not in text:
    raise SystemExit('saveDepartment correction target not found')
text = text.replace(bad_department, good_department, 1)

bad_event = """      data.title,
      data.description || '',
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
"""
good_event = """      data.title,
      data.description || '',
      data.trace_id || newTraceId(),
      new Date().toISOString(),
      function (this: RunResult, err: Error | null) {
"""
if bad_event not in text:
    raise SystemExit('saveActivityEvent correction target not found')
text = text.replace(bad_event, good_event, 1)

p.write_text(text)
Path('scripts/fix-alpha1-core-bridge.py').unlink()
