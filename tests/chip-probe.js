#!/usr/bin/env node
// Honeylight chip probe: how does this machine do the drawing math?
// The game's pictures are drawn by software on the CPU, and CPU types round some math in different ways.
// This tool runs small pieces of drawing math (and of JavaScript math) on fixed numbers and keeps every bit of each result.
//   node tests/chip-probe.js                 print a checksum for each piece, write tests/out/chip-probe-<system>-<cpu>.json
//   node tests/chip-probe.js A.json B.json   compare two result files: for each piece, how many results differ and by how much
// It needs no game files. The runner's own short check (harness.js machine()) uses the same idea.
const fs = require('fs'), path = require('path');
const H = require('./harness.js');

// runs in the page
async function probe() {
  const N = 64, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const gl = cv.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) return { error: 'no webgl2' };
  gl.getExtension('EXT_color_buffer_float');
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const env = { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : String(gl.getParameter(gl.RENDERER)), agent: navigator.userAgent };
  // things outside the math that a game could read from the machine
  try { const ac = new (window.AudioContext || window.webkitAudioContext)(); env.soundRate = ac.sampleRate; ac.close(); } catch (e) { env.soundRate = 'none: ' + e.message; }
  { const c2 = document.createElement('canvas').getContext('2d'), w = f => { c2.font = f; return c2.measureText('The walled garden 20 honey').width; };
    env.text = { georgiaItalic56: w('italic 56px Georgia, serif'), georgia44: w('44px Georgia, serif'), serif44: w('44px serif'), sans44: w('44px sans-serif'), hasGeorgia: document.fonts.check('44px Georgia') };
    env.screen = { pixelRatio: devicePixelRatio, cores: navigator.hardwareConcurrency, platform: navigator.platform, language: navigator.language, zone: Intl.DateTimeFormat().resolvedOptions().timeZone, maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE), touch: navigator.maxTouchPoints }; }
  let s = 0x9e3779b9 >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = {}, dumps = {};
  const b64 = u8 => { let r = ''; for (let i = 0; i < u8.length; i += 0x8000) r += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(r); };
  const sum = (arr, k, step) => { let h = 2166136261 >>> 0; for (let i = k; i < arr.length; i += step) h = Math.imul(h ^ arr[i], 16777619) >>> 0; return h.toString(16).padStart(8, '0'); };
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o) + '\n' + src); return o; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const tex = (ifmt, w, h, fmt, type, data, filter) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data); for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, filter || gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const fbo = t => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
  // fixed inputs, one set for each pixel: a in -10..10, b in 0.01..4, c in -1000..1000, d in 0..1
  const inp = new Float32Array(N * N * 4); for (let i = 0; i < N * N; i++) { inp[i * 4] = rnd() * 20 - 10; inp[i * 4 + 1] = 0.01 + rnd() * 3.99; inp[i * 4 + 2] = rnd() * 2000 - 1000; inp[i * 4 + 3] = rnd(); }
  const tIn = tex(gl.RGBA32F, N, N, gl.RGBA, gl.FLOAT, inp);
  const b8 = new Uint8Array(8 * 8 * 4); for (let i = 0; i < b8.length; i++) b8[i] = Math.floor(rnd() * 256);
  const tLin = tex(gl.RGBA8, 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, b8, gl.LINEAR);
  const dep = new Float32Array(16 * 16); for (let i = 0; i < dep.length; i++) dep[i] = rnd();
  const tSh = tex(gl.DEPTH_COMPONENT32F, 16, 16, gl.DEPTH_COMPONENT, gl.FLOAT, dep, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
  const tU = tex(gl.RGBA32UI, N, N, gl.RGBA_INTEGER, gl.UNSIGNED_INT, null), fU = fbo(tU);
  const t8 = tex(gl.RGBA8, N, N, gl.RGBA, gl.UNSIGNED_BYTE, null), f8 = fbo(t8);
  const tH = tex(gl.RGBA16F, N, N, gl.RGBA, gl.HALF_FLOAT, null), fH = fbo(tH);
  const M = [0.81, 0.13, -0.57, 0.11, -0.21, 0.93, 0.29, -0.07, 0.55, -0.34, 0.77, 0.19, 0.31, -0.23, 0.41, 1.37];
  const VS = `#version 300 es\nvoid main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.0-1.0,0.0,1.0); }`;
  const HEAD = `#version 300 es\nprecision highp float; precision highp int; precision highp sampler2D; precision highp sampler2DShadow;
uniform sampler2D tIn; uniform sampler2D tLin; uniform sampler2D tHalf; uniform sampler2DShadow tSh; uniform mat4 uM; uniform float uTime;
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
uint hu(uint x){ x^=x>>16; x*=0x7feb352dU; x^=x>>15; x*=0x846ca68bU; x^=x>>16; return x; }
float h01(uint x){ return float(hu(x)>>8)*5.9604644775390625e-8; }
vec3 aces(vec3 x){ return (x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14); }
#define IN ivec2 ip=ivec2(gl_FragCoord.xy); vec4 t=texelFetch(tIn,ip,0); float a=t.x,b=t.y,c=t.z,d=t.w,fi=float(ip.x),fj=float(ip.y);
`;
  const use = p => { gl.useProgram(p); const u = n => gl.getUniformLocation(p, n);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tIn); gl.uniform1i(u('tIn'), 0); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tLin); gl.uniform1i(u('tLin'), 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tSh); gl.uniform1i(u('tSh'), 2); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, tH); gl.uniform1i(u('tHalf'), 3);
    gl.uniformMatrix4fv(u('uM'), false, new Float32Array(M)); gl.uniform1f(u('uTime'), 37.283333); };
  const readU = () => { const r = new Uint32Array(N * N * 4); gl.readPixels(0, 0, N, N, gl.RGBA_INTEGER, gl.UNSIGNED_INT, r); return r; };
  const read8 = () => { const r = new Uint8Array(N * N * 4); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, r); return r; };
  gl.viewport(0, 0, N, N); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  // 1. one float result for each channel, kept bit for bit
  const bits = (names, exprs) => { const e = exprs.concat(['0.0', '0.0', '0.0']).slice(0, 4);
    use(prog(VS, HEAD + `layout(location=0) out highp uvec4 o;\nvoid main(){ IN o=uvec4(floatBitsToUint(${e[0]}),floatBitsToUint(${e[1]}),floatBitsToUint(${e[2]}),floatBitsToUint(${e[3]})); }`));
    gl.bindFramebuffer(gl.FRAMEBUFFER, fU); gl.drawArrays(gl.TRIANGLES, 0, 3); const r = readU(); names.forEach((n, k) => { out[n] = sum(r, k, 4); }); dumps[names.join(',')] = b64(new Uint8Array(r.buffer)); };
  bits(['mul', 'add', 'div', 'mul-add'], ['a*b', 'a+c', 'a/b', 'a*b+c']);
  bits(['dot2', 'dot3', 'length', 'normalize'], ['dot(vec2(a,b),vec2(c,d))', 'dot(vec3(a,b,d),vec3(d,c,a))', 'length(vec3(a,b,d))', 'normalize(vec3(a,b,d)).x']);
  bits(['sqrt', 'inversesqrt', 'one-over', 'mix'], ['sqrt(b)', 'inversesqrt(b)', '1.0/b', 'mix(a,c,d)']);
  bits(['sin', 'cos', 'sin-large', 'tan'], ['sin(a)', 'cos(a)', 'sin(c)', 'tan(d)']);
  bits(['exp', 'log', 'pow', 'exp2'], ['exp(a)', 'log(b)', 'pow(b,d*3.0)', 'exp2(a)']);
  bits(['atan2', 'asin', 'acos', 'atan'], ['atan(a,b)', 'asin(d)', 'acos(d)', 'atan(a)']);
  bits(['fract', 'floor', 'smoothstep', 'mod'], ['fract(c*123.34)', 'floor(c*0.37)', 'smoothstep(0.2,0.8,d)', 'mod(c,7.3)']);
  bits(['hash21-whole', 'hash21-mul-add', 'sin-hash', 'sin-hash-dot'], ['hash21(vec2(fi,fj))', 'hash21(vec2(fi+fj*1.7,fj*3.1+0.5))', 'fract(sin(fi*12.9898+fj*78.233)*43758.5453)', 'fract(sin(dot(vec2(fi,fj),vec2(12.9898,78.233)))*43758.5453)']);
  bits(['whole-number-hash', 'bits-hash', 'matrix', 'divide-by-w'], ['h01(uint(ip.x)*0x9e3779b1U^hu(uint(ip.y)))', 'h01(floatBitsToUint(a)^hu(floatBitsToUint(c)))', '(uM*vec4(a,b,d,1.0)).x', '(uM*vec4(a,b,d,1.0)).x/(uM*vec4(a,b,d,1.0)).w']);
  bits(['tone-map', 'gamma', 'texture-linear', 'shadow-compare'], ['aces(vec3(b,d,b*d)).x', 'pow(d,0.4545)', 'texture(tLin,vec2(d,fract(a))).x', 'texture(tSh,vec3(d,fract(a),fract(b)))']);
  // 2. what an 8-bit picture keeps: rounding to 0..255, and blending
  const px8 = (name, body, blend) => { gl.bindFramebuffer(gl.FRAMEBUFFER, f8); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    body.forEach((b, i) => { use(prog(VS, HEAD + `layout(location=0) out vec4 o;\nvoid main(){ IN ${b} }`)); if (blend && i) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); } gl.drawArrays(gl.TRIANGLES, 0, 3); }); gl.disable(gl.BLEND);
    const r = read8(); out[name] = sum(r, 0, 1); dumps[name] = b64(r); };
  px8('to-8-bit', ['o=vec4(d,fract(a),b*0.25,d*d);']);
  px8('final-colour-8-bit', ['vec3 col=vec3(b*d,d,fract(a)*b); col=clamp(aces(col),0.0,1.0); col=pow(col,vec3(0.4545)); col=col*0.985+0.01*vec3(1.0,0.88,0.7)*(1.0-col); o=vec4(col,1.0);']);
  px8('blend-8-bit', ['o=vec4(d,b*0.25,fract(a),1.0);', 'o=vec4(fract(c),d,0.3,0.37+0.5*d);'], true);
  // 3. half-float picture (the game draws its scene into one): what is kept of a float
  use(prog(VS, HEAD + `layout(location=0) out vec4 o;\nvoid main(){ IN o=vec4(a,b,c*0.01,d); }`)); gl.bindFramebuffer(gl.FRAMEBUFFER, fH); gl.drawArrays(gl.TRIANGLES, 0, 3);
  use(prog(VS, HEAD + `layout(location=0) out highp uvec4 o;\nvoid main(){ o=floatBitsToUint(texelFetch(tHalf,ivec2(gl_FragCoord.xy),0)); }`)); gl.bindFramebuffer(gl.FRAMEBUFFER, fU); gl.drawArrays(gl.TRIANGLES, 0, 3);
  { const r = readU(); out['half-float'] = sum(r, 0, 1); dumps['half-float'] = b64(new Uint8Array(r.buffer)); }
  // 4. triangles: which pixels they cover, and what a value that is the same at all three corners is inside the triangle
  const T = 40, pos = new Float32Array(T * 3 * 4), val = new Float32Array(T * 3), uv = new Float32Array(T * 3 * 2);
  for (let i = 0; i < T; i++) { const x = rnd() * 1.7 - 0.85, y = rnd() * 1.2 - 0.9, w = 0.015 + rnd() * 0.07, h = 0.25 + rnd() * 0.6, lean = rnd() * 0.5 - 0.25, v = rnd() * 3 + 0.01, z = rnd() * 0.8 - 0.4;
    const P = [[x - w, y, 1 + rnd() * 2], [x + w, y, 1 + rnd() * 2], [x + lean, y + h, 1 + rnd() * 2]];
    P.forEach((p, k) => { const o = (i * 3 + k) * 4; pos[o] = p[0] * p[2]; pos[o + 1] = p[1] * p[2]; pos[o + 2] = z * p[2]; pos[o + 3] = p[2]; val[i * 3 + k] = v; uv[(i * 3 + k) * 2] = k === 1 ? 1 : 0; uv[(i * 3 + k) * 2 + 1] = k === 2 ? 1 : 0; }); }
  const buf = (loc, data, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
  const tri = (name, sway) => { const p = prog(`#version 300 es\nlayout(location=0) in vec4 aPos; layout(location=1) in float aV; layout(location=2) in vec2 aUv; uniform float uTime; out float vS; flat out float vF; out vec2 vUv;
void main(){ vS=aV; vF=aV; vUv=aUv; vec4 p=aPos; ${sway ? 'p.x+=0.05*sin(uTime*1.6+aV*31.0)*aUv.y*p.w;' : ''} gl_Position=p; }`, HEAD + `in float vS; flat in float vF; in vec2 vUv; layout(location=0) out highp uvec4 o;
void main(){ o=uvec4(floatBitsToUint(vS),floatBitsToUint(vF),floatBitsToUint(vUv.x),floatBitsToUint(hash21(vec2(3.0,vS*91.7)))); }`);
    use(p); buf(0, pos, 4); buf(1, val, 1); buf(2, uv, 2); gl.bindFramebuffer(gl.FRAMEBUFFER, fU); gl.clearBufferuiv(gl.COLOR, 0, new Uint32Array(4)); gl.drawArrays(gl.TRIANGLES, 0, T * 3); const r = readU();
    let cov = 0, off = 0; const mask = new Uint32Array(N * N); for (let i = 0; i < N * N; i++) { if (r[i * 4 + 1]) { cov++; mask[i] = 1; if (r[i * 4] !== r[i * 4 + 1]) off++; } }
    out[name + '-cover'] = sum(mask, 0, 1); out[name + '-same-value-smooth'] = sum(r, 0, 4); out[name + '-same-value-flat'] = sum(r, 1, 4); out[name + '-slope'] = sum(r, 2, 4); out[name + '-hash-of-smooth'] = sum(r, 3, 4);
    out[name + '-note'] = `${cov} pixels covered; in ${off} of them the smooth value is not exactly the corner value`; dumps[name] = b64(new Uint8Array(r.buffer)); };
  tri('triangles', false); tri('triangles-swayed', true);
  // 5. JavaScript math in this browser
  { const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan, atan: Math.atan, exp: x => Math.exp(x % 50), log: x => Math.log(Math.abs(x) + 1e-9), sqrt: x => Math.sqrt(Math.abs(x)), pow: x => Math.pow(Math.abs(x) % 9 + 0.01, (x * 0.37) % 6), atan2: x => Math.atan2(x, x * 0.731 + 0.2), hypot: x => Math.hypot(x, x * 1.7, 3.3), 'sin-to-float': x => Math.fround(Math.sin(x)), 'sin-hash': x => { const v = Math.sin(x * 12.9898) * 43758.5453; return Math.fround(v - Math.floor(v)); } };
    const xs = new Float64Array(40000); for (let i = 0; i < xs.length; i++) { const r = rnd(); xs[i] = i % 4 === 0 ? (r - 0.5) * 2e5 : i % 4 === 1 ? (r - 0.5) * 20 : i % 4 === 2 ? r * 1e-3 : (i * 12.9898 + r); }
    const f64 = new Float64Array(1), u = new Uint32Array(f64.buffer);
    for (const [name, f] of Object.entries(fns)) { let h = 2166136261 >>> 0; for (let i = 0; i < xs.length; i++) { f64[0] = f(xs[i]); h = Math.imul(h ^ u[0], 16777619) >>> 0; h = Math.imul(h ^ u[1], 16777619) >>> 0; } out['js-' + name] = h.toString(16).padStart(8, '0'); } }
  return { env, out, dumps };
}

function compare(fa, fb) {
  const A = JSON.parse(fs.readFileSync(fa, 'utf8')), B = JSON.parse(fs.readFileSync(fb, 'utf8'));
  console.log(`A: ${A.machine}\n   ${JSON.stringify(A.env && { soundRate: A.env.soundRate, text: A.env.text, screen: A.env.screen })}\nB: ${B.machine}\n   ${JSON.stringify(B.env && { soundRate: B.env.soundRate, text: B.env.text, screen: B.env.screen })}\n`);
  const same = [], diff = [];
  for (const k of Object.keys(A.out)) { if (k.endsWith('-note')) continue; (A.out[k] === B.out[k] ? same : diff).push(k); }
  console.log(`the same on both (${same.length}): ${same.join(', ')}\n\ndifferent (${diff.length}):`);
  // for the pieces kept bit for bit: how many of the results differ, and by how many steps of the float (1 step = the last digit)
  for (const [names, d] of Object.entries(A.dumps)) { const e = B.dumps[names]; if (!e || d === e) continue; const ns = names.split(',');
    const a = Buffer.from(d, 'base64'), b = Buffer.from(e, 'base64');
    if (/8-bit/.test(names)) { let n = 0, mx = 0; for (let i = 0; i < a.length; i++) { const dd = Math.abs(a[i] - b[i]); if (dd) { n++; if (dd > mx) mx = dd; } } console.log(`  ${names.padEnd(22)} ${n} of ${a.length} bytes differ, by at most ${mx} of 255`); continue; }
    const ua = new Uint32Array(a.buffer, a.byteOffset, a.length / 4), ub = new Uint32Array(b.buffer, b.byteOffset, b.length / 4), f = new Float32Array(1), u = new Uint32Array(f.buffer);
    const chan = /^triangles/.test(names) ? ['same-value-smooth', 'same-value-flat', 'slope', 'hash-of-smooth'].map(x => names + '-' + x) : names === 'half-float' ? ['half-float', 'half-float', 'half-float', 'half-float'] : ns;
    const st = {}; for (let i = 0; i < ua.length; i++) { if (ua[i] === ub[i]) continue; const k = chan[i % 4] || '?'; const o = st[k] || (st[k] = { n: 0, steps: 0, val: 0 }); o.n++;
      const steps = Math.abs((ua[i] & 0x7fffffff) - (ub[i] & 0x7fffffff)); if (steps > o.steps) o.steps = steps; u[0] = ua[i]; const x = f[0]; u[0] = ub[i]; const dv = Math.abs(x - f[0]); if (dv > o.val) o.val = dv; }
    for (const [k, o] of Object.entries(st)) console.log(`  ${k.padEnd(22)} ${String(o.n).padStart(5)} of ${ua.length / 4} differ, by at most ${o.steps} float steps (largest change in value ${o.val.toExponential(2)})`); }
  const js = diff.filter(k => k.startsWith('js-')); if (js.length) console.log(`  JavaScript math: ${js.join(', ')}`);
  const cov = diff.filter(k => k.endsWith('-cover')); if (cov.length) console.log(`  pixels covered by triangles: ${cov.join(', ')}`);
}

(async () => {
  const files = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (files.length === 2) return compare(files[0], files[1]);
  const browser = await H.launch(), page = await browser.newPage(); await page.setContent('<!doctype html><title>probe</title>');
  let r; try { r = await page.evaluate(probe); } finally { await browser.close(); }
  if (r.error) { console.error(r.error); process.exit(1); }
  const machine = `${process.platform} ${process.arch}, Chromium ${browser.version()}, ${r.env.renderer}`;
  console.log(machine + '\n' + JSON.stringify({ soundRate: r.env.soundRate, text: r.env.text, screen: r.env.screen }) + '\n'); const keys = Object.keys(r.out); const wdt = Math.max(...keys.map(k => k.length));
  for (const k of keys) console.log(`  ${k.padEnd(wdt)}  ${r.out[k]}`);
  const dir = path.join(__dirname, 'out'); fs.mkdirSync(dir, { recursive: true }); const file = path.join(dir, `chip-probe-${process.platform}-${process.arch}.json`);
  fs.writeFileSync(file, JSON.stringify({ machine, platform: process.platform, arch: process.arch, chromium: browser.version(), env: r.env, out: r.out, dumps: r.dumps })); console.log('\nsaved ' + path.relative(process.cwd(), file));
})().catch(e => { console.error(e); process.exit(1); });
