// Monolith Codex worldbreaker pass — companion to tests/monolith-
// adversarial.js, using the `worldbreaker` skill's discipline. UI-driven
// only: real wizard clicks/typing, real file input for corrupt-JSON
// import attacks, real download interception for the export→reimport
// round-trip (Playwright can capture a real `page.on('download')` event
// headlessly — no need to fake it). Written as the pre-alpha "last gate"
// pass alongside monolith-worldbreaker-arena.js.
//
// Scope: empty wizard submit, messy/XSS strings across every text field
// (Esori name, Tulpa name/activation/effect/sustain), corrupt/malformed
// JSON import (garbage text, empty object, missing fields, wrong types,
// bad schema version), a 15-Esori stress add through the real wizard, a
// real export→clear→reimport round-trip, and a mobile-viewport pass
// through the creation wizard.
//
// Usage: serve the repo (`npx http-server -p 8123`), then
// `NODE_PATH=/opt/node22/lib/node_modules node tests/monolith-worldbreaker-codex.js`.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const CODEX = process.env.MONOLITH_CODEX_URL || 'http://localhost:8123/prototypes/monolith-codex.html';
const CHROMIUM_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

let pass = 0, fail = 0;
const findings = [];
function ok(cond, label, note) {
  if (cond) { pass++; console.log('  ✓', label); }
  else { fail++; findings.push({ label, note: note || '' }); console.log('  ✗', label, note ? '— ' + note : ''); }
}
async function checkPageHealth(page, label) {
  const healthy = await page.evaluate(() => document.body && document.body.innerText.length > 0);
  ok(healthy, `[health] ${label} — page has real content`);
}
async function checkNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 2, `[overflow] ${label} — no horizontal scroll (delta ${overflow}px)`, overflow > 2 ? `scrollWidth exceeds viewport by ${overflow}px` : '');
}
function writeTmp(name, content) {
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, content);
  return p;
}

async function freshCodex(page) {
  await page.goto(CODEX);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => typeof Codex !== 'undefined');
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const globalErrors = [];
  page.on('pageerror', e => globalErrors.push('PAGEERROR: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) globalErrors.push('CONSOLE: ' + msg.text()); });
  const dialogsSeen = [];
  page.on('dialog', d => { dialogsSeen.push(d.message()); d.accept(); }); // catch-all so nothing hangs; specific stages register their own page.once first
  const snap = () => globalErrors.length;
  const newErrs = (s) => globalErrors.slice(s);

  await freshCodex(page);

  console.log('\n=== STAGE 1: empty submit — click through the wizard and try to save with NOTHING filled ===');
  {
    const s = snap();
    await page.click('text=+ New Esori');
    await page.click('text=Class →');
    await page.click('text=Position →');
    await page.click('text=Tulpa →');
    await page.click('text=Weapon →');
    await page.click('text=Review →');
    await page.click('text=Save to Roster');
    await page.waitForTimeout(150);
    const errorBoxText = await page.evaluate(() => document.getElementById('review-errors')?.textContent || '');
    const rosterCountAfter = await page.evaluate(() => (JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster || []).length);
    console.log('  Review error box after empty submit:', JSON.stringify(errorBoxText));
    console.log('  Roster count after attempted empty save:', rosterCountAfter);
    ok(errorBoxText.includes('Before you save'), 'a clear "missing fields" message is shown, not a silent failure', `error box text: "${errorBoxText}"`);
    ok(rosterCountAfter === 0, 'nothing was actually saved to the roster with all fields empty', `roster has ${rosterCountAfter} entries`);
    await checkPageHealth(page, 'after empty submit attempt');
    const e = newErrs(s);
    ok(e.length === 0, 'empty submit produced no JS errors', e.join(' | '));
  }

  console.log('\n=== STAGE 2: messy real-world strings + XSS across every text field in the wizard ===');
  {
    const s = snap();
    await freshCodex(page); // Stage 1 ended on the Review step, not a fresh wizard
    await page.click('text=+ New Esori');
    await page.evaluate(() => window.__xss = false);
    const messyName = `O'Brien & Sons 🍕日本語 <script>window.__xss=true</script>`;
    await page.fill('#field-name', messyName);
    await page.click('text=Class →');
    await page.click('#class-group .opt-btn:has-text("Bishop")');
    await page.click('text=Position →');
    await page.click('#position-group .opt-btn:has-text("Saboteur")');
    await page.click('text=Tulpa →');
    await page.fill('#field-tulpa-name', `  leading/trailing spaces  `);
    await page.fill('#field-activation', `<img src=x onerror="window.__xss=true">`);
    await page.fill('#field-effect', 'a'.repeat(500)); // very long string
    await page.fill('#field-sustain', `"quotes" & <b>tags</b>`);
    await page.click('text=Weapon →');
    await page.click('#weapon-group .opt-btn:has-text("Wand")');
    await page.click('text=Review →');
    await page.waitForTimeout(100);
    const xssTriggered = await page.evaluate(() => !!window.__xss);
    ok(!xssTriggered, 'no XSS payload executed while typing messy/malicious strings into every text field', xssTriggered ? 'window.__xss became true' : '');
    const reviewHtml = await page.evaluate(() => document.getElementById('s5')?.innerHTML.length > 0); // #s5 is the actual Review step's sheet container
    ok(reviewHtml, 'Review screen still rendered with messy strings in every field (no crash from special characters)');
    await page.click('text=Save to Roster');
    await page.waitForTimeout(150);
    const savedName = await page.evaluate(() => {
      const roster = JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster;
      return roster[roster.length - 1]?.name;
    });
    console.log('  Name actually saved:', JSON.stringify(savedName));
    ok(savedName === messyName, 'the messy name string round-tripped through save exactly as typed (no silent mangling/truncation)', `saved: "${savedName}"`);
    // Now check the ROSTER LIST rendering (a separate render path from Review) for the same XSS payload.
    await page.evaluate(() => window.__xss = false);
    await page.reload();
    await page.waitForFunction(() => typeof Codex !== 'undefined');
    await page.waitForTimeout(150);
    const xssOnRosterRender = await page.evaluate(() => !!window.__xss);
    ok(!xssOnRosterRender, 'no XSS payload executed when the roster LIST re-rendered the same saved name after reload (escapeHtml holding on a second, separate render path)');
    await checkPageHealth(page, 'after messy-string + XSS wizard pass');
    const e = newErrs(s);
    ok(e.length === 0, 'messy strings + XSS attempts produced no JS errors', e.join(' | '));
  }

  console.log('\n=== STAGE 3: corrupt / malformed JSON import ===');
  {
    const s = snap();
    const cases = [
      { file: 'garbage.json', content: 'this is not json at all {{{', label: 'garbage text (not JSON)' },
      { file: 'empty-obj.json', content: '{}', label: 'empty object' },
      { file: 'missing-fields.json', content: JSON.stringify({ schemaVersion: 1, exportMode: 'backup', esori: { name: 'NoRequiredFields' } }), label: 'required fields missing' },
      { file: 'wrong-types.json', content: JSON.stringify({ schemaVersion: 1, exportMode: 'backup', esori: { esoriId: 123, updatedAt: null, name: ['not', 'a', 'string'], class: 'knight', position: 'vanguard', rarity: 'one', tulpa: 'not an object' } }), label: 'required fields present but wrong types' },
      { file: 'wrong-schema.json', content: JSON.stringify({ schemaVersion: 99, exportMode: 'backup', esori: {} }), label: 'unrecognized schemaVersion' },
    ];
    const rosterBefore = await page.evaluate(() => (JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster || []).length);
    for (const c of cases) {
      const p = writeTmp(c.file, c.content);
      await page.setInputFiles('#import-file', p);
      await page.click('#import-btn');
      await page.waitForTimeout(150);
      const statusText = await page.evaluate(() => document.getElementById('import-status')?.textContent || '');
      const statusIsErr = await page.evaluate(() => document.getElementById('import-status')?.classList.contains('err'));
      console.log(`  [${c.label}] status:`, JSON.stringify(statusText), 'err class:', statusIsErr);
      ok(statusIsErr === true, `${c.label} — rejected with a visible error status, not silently accepted`, `status: "${statusText}", err=${statusIsErr}`);
    }
    const rosterAfter = await page.evaluate(() => (JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster || []).length);
    ok(rosterAfter === rosterBefore, 'existing roster data is completely untouched after every corrupt-import attempt', `before=${rosterBefore}, after=${rosterAfter}`);
    await checkPageHealth(page, 'after corrupt-import gauntlet');
    const e = newErrs(s);
    ok(e.length === 0, 'corrupt JSON imports produced no JS errors', e.join(' | '));
  }

  console.log('\n=== STAGE 4: stress — add 15 Esori through the real creation wizard ===');
  {
    const s = snap();
    await freshCodex(page);
    const classes = ['Knight', 'Bishop', 'Rook'];
    const positions = ['Vanguard', 'Saboteur', 'Infiltrator'];
    const weapons = { Knight: 'Sword', Bishop: 'Wand', Rook: 'Dagger' };
    const t0 = Date.now();
    for (let i = 0; i < 15; i++) {
      const cls = classes[i % 3], pos = positions[i % 3];
      await page.click('text=+ New Esori');
      await page.fill('#field-name', `StressUnit${i}`);
      await page.click('text=Class →');
      await page.click(`#class-group .opt-btn:has-text("${cls}")`);
      await page.click('text=Position →');
      await page.click(`#position-group .opt-btn:has-text("${pos}")`);
      await page.click('text=Tulpa →');
      await page.fill('#field-tulpa-name', `T${i}`);
      await page.fill('#field-activation', `a${i}`);
      await page.fill('#field-effect', `e${i}`);
      await page.fill('#field-sustain', `s${i}`);
      await page.click('text=Weapon →');
      await page.click(`#weapon-group .opt-btn:has-text("${weapons[cls]}")`);
      await page.click('text=Review →');
      await page.click('text=Save to Roster');
      await page.waitForTimeout(40);
    }
    const elapsedMs = Date.now() - t0;
    const rosterCount = await page.evaluate(() => (JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster || []).length);
    console.log(`  Added 15 Esori via the real wizard in ${elapsedMs}ms; roster count now ${rosterCount}`);
    ok(rosterCount === 15, 'all 15 real wizard submissions actually landed in the roster', `roster has ${rosterCount}`);
    await page.goto(CODEX);
    await page.waitForTimeout(200);
    const t1 = Date.now();
    await page.waitForSelector('#roster-list, .roster-list, [id*="roster"]', { state: 'attached' }).catch(() => {});
    const renderMs = Date.now() - t1;
    console.log(`  Roster-list render after reload with 15 entries: ~${renderMs}ms`);
    ok(renderMs < 2000, 'roster-list render with 15 entries stayed under 2s (headless smoke test)', `${renderMs}ms`);
    await checkNoHorizontalOverflow(page, 'roster list with 15 entries (desktop)');
    await checkPageHealth(page, 'after 15-entry stress add');
    const e = newErrs(s);
    ok(e.length === 0, 'stress-adding 15 Esori produced no JS errors', e.join(' | '));
  }

  console.log('\n=== STAGE 5: feature interaction — real export download → clear roster → real import → verify round-trip ===');
  {
    const s = snap();
    await freshCodex(page);
    await page.click('text=+ New Esori');
    await page.fill('#field-name', 'RoundTripUnit');
    await page.click('text=Class →');
    await page.click('#class-group .opt-btn:has-text("Rook")');
    await page.click('text=Position →');
    await page.click('#position-group .opt-btn:has-text("Infiltrator")');
    await page.click('text=Tulpa →');
    await page.fill('#field-tulpa-name', 'RT Tulpa');
    await page.fill('#field-activation', 'RT activation');
    await page.fill('#field-effect', 'RT effect');
    await page.fill('#field-sustain', 'RT sustain');
    await page.click('text=Weapon →');
    await page.click('#weapon-group .opt-btn:has-text("Dagger")');
    await page.click('text=Review →');
    await page.click('text=Save to Roster');
    await page.waitForTimeout(150);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export (Backup)")'),
    ]);
    const downloadPath = path.join(os.tmpdir(), 'roundtrip-export.json');
    await download.saveAs(downloadPath);
    const exportedRaw = fs.readFileSync(downloadPath, 'utf8');
    let exportedJson = null;
    try { exportedJson = JSON.parse(exportedRaw); } catch (e) {}
    ok(exportedJson && exportedJson.esori && exportedJson.esori.name === 'RoundTripUnit', 'the REAL downloaded file is valid JSON containing the Esori we just created', exportedJson ? `name in file: ${exportedJson.esori?.name}` : 'file was not valid JSON');

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => typeof Codex !== 'undefined');
    const rosterAfterClear = await page.evaluate(() => (JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster || []).length);
    ok(rosterAfterClear === 0, 'roster genuinely cleared before reimport');

    await page.setInputFiles('#import-file', downloadPath);
    await page.click('#import-btn');
    await page.waitForTimeout(200);
    const statusAfterReimport = await page.evaluate(() => document.getElementById('import-status')?.textContent || '');
    const rosterAfterReimport = await page.evaluate(() => JSON.parse(localStorage.getItem('monolith-esori-chronicles-v1') || '{"roster":[]}').roster || []);
    console.log('  Reimport status:', JSON.stringify(statusAfterReimport), '— roster after reimport:', rosterAfterReimport.map(r => r.name));
    ok(rosterAfterReimport.length === 1 && rosterAfterReimport[0].name === 'RoundTripUnit', 'the REAL exported file, reimported through the REAL file input, correctly restored the exact same Esori', `roster: ${JSON.stringify(rosterAfterReimport.map(r => r.name))}`);
    ok(rosterAfterReimport[0]?.tulpa?.openWonderland?.activation === 'RT activation', 'nested Tulpa/Open Wonderland fields survived the real export→import round-trip intact');
    await checkPageHealth(page, 'after real export/reimport round-trip');
    const e = newErrs(s);
    ok(e.length === 0, 'the real export/reimport round-trip produced no JS errors', e.join(' | '));
  }

  console.log('\n=== STAGE 6: mobile viewport (390px) pass across Codex\'s main screens ===');
  {
    const s = snap();
    await page.setViewportSize({ width: 390, height: 844 });
    await freshCodex(page);
    await checkNoHorizontalOverflow(page, 'Codex roster/landing screen @390px');
    await page.click('text=+ New Esori');
    await checkNoHorizontalOverflow(page, 'Codex creation wizard, Identity step @390px');
    await page.fill('#field-name', 'MobileCheck');
    await page.click('text=Class →');
    await checkNoHorizontalOverflow(page, 'Codex creation wizard, Class step @390px');
    await page.click('#class-group .opt-btn:has-text("Knight")');
    await page.click('text=Position →');
    await page.click('#position-group .opt-btn:has-text("Vanguard")');
    await page.click('text=Tulpa →');
    await checkNoHorizontalOverflow(page, 'Codex creation wizard, Tulpa step @390px');
    await checkPageHealth(page, 'Codex @390px through the wizard');
    const e = newErrs(s);
    ok(e.length === 0, 'no new JS errors on the mobile-viewport wizard pass', e.join(' | '));
    await page.setViewportSize({ width: 1280, height: 900 });
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (findings.length) {
    console.log('\n--- FINDINGS ---');
    findings.forEach(f => console.log(`  ✗ ${f.label}${f.note ? ' — ' + f.note : ''}`));
  }
  console.log('\nAll JS errors seen across the whole run:', globalErrors.length ? globalErrors : 'none');
  console.log('Dialogs seen (unregistered catch-all):', dialogsSeen.length ? dialogsSeen : 'none');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('WORLDBREAKER SCRIPT FAILED TO COMPLETE:', e); process.exit(1); });
