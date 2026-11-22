// every token of the old file must still be there after the split (only const/let/var keywords and separators may go)
const acorn = require('acorn'), fs = require('fs'), path = require('path');
const toks = s => [...acorn.tokenizer(s, { ecmaVersion: 2022, sourceType: 'module' })].map(t => t.type.label + '|' + (t.value === undefined ? '' : typeof t.value === 'object' ? JSON.stringify(t.value) : t.value));
const count = a => { const m = new Map(); for (const x of a) m.set(x, (m.get(x) || 0) + 1); return m; };
const [oldDir, newDir] = process.argv.slice(2);
const A = count(toks(fs.readFileSync(path.join(oldDir, 'main.js'), 'utf8')));
const files = ['main.js', ...fs.readdirSync(path.join(newDir, 'src')).map(f => 'src/' + f)];
const B = count(files.flatMap(f => toks(fs.readFileSync(path.join(newDir, f), 'utf8'))));
const free = new Set(['const|const', 'name|let', 'var|var', ',|', ';|', 'import|import', '*|*', 'name|as', 'name|from', 'string|./three.module.min.js', 'name|THREE']);
let lost = 0, extra = 0; for (const [k, n] of A) if (!free.has(k) && (B.get(k) || 0) < n) { lost += n - (B.get(k) || 0); console.log('LOST', k.slice(0, 80), n, B.get(k) || 0); }
let tot = 0; for (const n of A.values()) tot += n; let totB = 0; for (const n of B.values()) totB += n;
console.log(`old ${tot} tokens, new ${totB} tokens, lost ${lost}`); process.exit(lost ? 1 : 0);
