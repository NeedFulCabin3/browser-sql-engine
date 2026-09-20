// each table keeps its rows in a plain array + a btree index on the first column (treated as primary key)

class Table {
  constructor(name, columns) {
    this.name = name;
    this.columns = columns;
    this.rows = [];
    this.index = new BTree(4);
  }

  insertRow(values) {
    if (values.length !== this.columns.length) {
      throw new Error(`expected ${this.columns.length} values, got ${values.length}`);
    }
    const row = {};
    this.columns.forEach((c, i) => row[c] = values[i]);
    this.rows.push(row);
    const pk = row[this.columns[0]];
    this.index.insert(pk, this.rows.length - 1);
  }
}

class Database {
  constructor() {
    this.tables = {};
    this.load();
  }

  createTable(name, columns) {
    if (this.tables[name]) throw new Error(`table "${name}" already exists`);
    this.tables[name] = new Table(name, columns);
  }

  getTable(name) {
    const t = this.tables[name];
    if (!t) throw new Error(`no such table: ${name}`);
    return t;
  }

  save() {
    const plain = {};
    for (const name in this.tables) {
      plain[name] = { columns: this.tables[name].columns, rows: this.tables[name].rows };
    }
    localStorage.setItem('minisql_db', JSON.stringify(plain));
  }

  load() {
    const raw = localStorage.getItem('minisql_db');
    if (!raw) return;
    try {
      const plain = JSON.parse(raw);
      for (const name in plain) {
        const t = new Table(name, plain[name].columns);
        plain[name].rows.forEach(r => t.insertRow(t.columns.map(c => r[c])));
        this.tables[name] = t;
      }
    } catch (e) {
      console.warn('could not restore db from storage', e);
    }
  }

  wipe() {
    this.tables = {};
    localStorage.removeItem('minisql_db');
  }
}

// -- super lightweight sql parser, handles CREATE TABLE / INSERT / SELECT with a WHERE clause --

function parseValue(v) {
  v = v.trim();
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  const num = Number(v);
  return isNaN(num) ? v : num;
}

function splitArgs(str) {
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

function runQuery(db, sql) {
  sql = sql.trim().replace(/;$/, '');

  let m;

  m = sql.match(/^CREATE TABLE\s+(\w+)\s*\((.+)\)$/i);
  if (m) {
    const name = m[1];
    const cols = splitArgs(m[2]);
    db.createTable(name, cols);
    db.save();
    return { type: 'ok', message: `table "${name}" created with columns: ${cols.join(', ')}` };
  }

  m = sql.match(/^INSERT INTO\s+(\w+)\s+VALUES\s*\((.+)\)$/i);
  if (m) {
    const table = db.getTable(m[1]);
    const values = splitArgs(m[2]).map(parseValue);
    table.insertRow(values);
    db.save();
    return { type: 'ok', message: `inserted 1 row into "${m[1]}"` };
  }

  m = sql.match(/^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i);
  if (m) {
    const table = db.getTable(m[2]);
    let rows = table.rows;

    if (m[3]) {
      rows = rows.filter(r => evalCondition(r, m[3]));
    }

    const cols = m[1].trim() === '*' ? table.columns : splitArgs(m[1]);
    const projected = rows.map(r => {
      const out = {};
      cols.forEach(c => out[c] = r[c]);
      return out;
    });

    return { type: 'rows', columns: cols, rows: projected };
  }

  throw new Error('could not understand that query, sorry');
}

// handles stuff like age > 20, name = 'Alice'
function evalCondition(row, cond) {
  const m = cond.match(/^(\w+)\s*(=|>|<|>=|<=|!=)\s*(.+)$/);
  if (!m) throw new Error(`bad WHERE clause: ${cond}`);

  const [, col, op, rawVal] = m;
  const val = parseValue(rawVal);
  const cell = row[col];

  switch (op) {
    case '=': return cell == val;
    case '!=': return cell != val;
    case '>': return cell > val;
    case '<': return cell < val;
    case '>=': return cell >= val;
    case '<=': return cell <= val;
  }
  return false;
}

// ---- ui wiring ----

const db = new Database();
const resultBox = document.getElementById('resultBox');
const statusEl = document.getElementById('status');

function renderResult(res) {
  if (res.type === 'ok') {
    resultBox.innerHTML = `<p>${res.message}</p>`;
    return;
  }

  if (res.rows.length === 0) {
    resultBox.innerHTML = '<p><em>0 rows</em></p>';
    return;
  }

  let html = '<table class="result-table"><thead><tr>';
  res.columns.forEach(c => html += `<th>${c}</th>`);
  html += '</tr></thead><tbody>';
  res.rows.forEach(r => {
    html += '<tr>' + res.columns.map(c => `<td>${r[c]}</td>`).join('') + '</tr>';
  });
  html += '</tbody></table>';
  resultBox.innerHTML = html;
}

function renderTableList() {
  const box = document.getElementById('tableList');
  const names = Object.keys(db.tables);
  if (names.length === 0) {
    box.innerHTML = '<em>no tables yet</em>';
    return;
  }
  box.innerHTML = names.map(name => {
    const t = db.tables[name];
    return `<div class="table-card"><b>${name}</b> (${t.columns.join(', ')})
      <div class="meta">${t.rows.length} rows</div></div>`;
  }).join('');
}

document.getElementById('runBtn').addEventListener('click', () => {
  const input = document.getElementById('sqlInput').value;
  const statements = input.split('\n').map(s => s.trim()).filter(Boolean);

  let lastRes = null;
  try {
    for (const stmt of statements) {
      lastRes = runQuery(db, stmt);
    }
    statusEl.textContent = 'ran ' + statements.length + ' statement(s)';
    renderResult(lastRes || { type: 'ok', message: 'done' });
  } catch (err) {
    resultBox.innerHTML = `<div class="error">${err.message}</div>`;
    statusEl.textContent = 'error';
  }
  renderTableList();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  db.wipe();
  resultBox.innerHTML = '<em>db cleared</em>';
  statusEl.textContent = '';
  renderTableList();
});

renderTableList();
