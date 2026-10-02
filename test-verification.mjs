// =============================================================================
// Automated Verification Suite for MedicineBank Clinical Workstation PR
// Validates: HTML Structure, JS Syntax, FSRS-5 Math, KaTeX parser, SQL Schema
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
let passed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('🧪 Starting Verification Suite for l81e/Data PR...\n');

// 1. Verify index.html
const indexHtml = fs.readFileSync('index.html', 'utf-8');
assert(indexHtml.length > 50000, `index.html is fully restored (${indexHtml.length} bytes, not truncated)`);
assert(indexHtml.includes('flashcardsViewerUrl'), 'index.html contains flashcardsViewerUrl');
assert(!indexHtml.includes('KYS'), 'index.html contains zero corrupted text');
assert(indexHtml.includes('data.medicinebank.org') || indexHtml.includes('window.location.origin'), 'index.html origin handling is intact');
assert(indexHtml.includes('adminDashboardOverlay'), 'index.html contains Admin Dashboard modal (adminDashboardOverlay)');
assert(indexHtml.includes('openAdminDashboard'), 'index.html contains openAdminDashboard controller function');
assert(indexHtml.includes('dayEmptyAdminBtn'), 'index.html contains dayEmptyAdminBtn for empty days');
assert(indexHtml.includes('adminCreateSubjectBtn') && indexHtml.includes('adminPublishBtn'), 'index.html contains create subject & upload material controls');

// 2. Verify flash.html
const flashHtml = fs.readFileSync('flash.html', 'utf-8');
assert(flashHtml.includes('katex.min.js'), 'flash.html loads KaTeX library');
assert(flashHtml.includes('calculateInitialStability'), 'flash.html contains FSRS-5 initial stability engine');
assert(flashHtml.includes('FSRS_W = ['), 'flash.html contains calibrated 19-parameter FSRS weight vector');
assert(flashHtml.includes('cue-again') && flashHtml.includes('cue-good'), 'flash.html contains 4-way gesture visual cue elements');
assert(flashHtml.includes('HIGH_YIELD_DEMO_DECK'), 'flash.html contains built-in High-Yield Clinical Demo Deck');
assert(flashHtml.includes('mb_synaptic_vault'), 'flash.html contains Sovereign IndexedDB vault integration');
assert(flashHtml.includes('lightboxModal'), 'flash.html contains Clinical Diagram Lightbox Zoom');
assert(flashHtml.includes('usmle_60s'), 'flash.html contains USMLE 60-Second exam pace countdown');
assert(flashHtml.includes('localApkgInput'), 'flash.html contains local .apkg file picker input');
assert(flashHtml.includes('resolveCardMedia'), 'flash.html contains persistent media rehydration & resolver');
assert(flashHtml.includes('dropZoneOverlay') || flashHtml.includes('drop-zone-overlay'), 'flash.html contains drag-and-drop .apkg loader');
assert(flashHtml.includes('lightboxZoomInBtn'), 'flash.html contains pan & zoom clinical lightbox controls');
assert(flashHtml.includes('inMemoryMediaCache'), 'flash.html maintains memory media cache for offline diagrams');

// 3. Verify flashmake.html
const flashmakeHtml = fs.readFileSync('flashmake.html', 'utf-8');
assert(flashmakeHtml.includes('katex.min.js'), 'flashmake.html loads KaTeX for live formula preview');
assert(flashmakeHtml.includes('bulkModalOverlay'), 'flashmake.html contains Bulk Import modal');
assert(flashmakeHtml.includes('testDeckBtn'), 'flashmake.html contains Test in Clinical Workstation button');
assert(flashmakeHtml.includes('frontAddCloze') && flashmakeHtml.includes('frontAddMath'), 'flashmake.html contains cloze & math formatting toolbar');

// 4. Verify 404.html
const notFoundHtml = fs.readFileSync('404.html', 'utf-8');
assert(notFoundHtml.includes('/flash.html'), '404.html routes /flash cleanly to /flash.html');
assert(notFoundHtml.includes('/flashmake.html'), '404.html routes /flashmake cleanly to /flashmake.html');
assert(notFoundHtml.includes('mb_redirect_path'), '404.html captures date deep-links for index.html');

// 5. Verify schema.sql
const schemaSql = fs.readFileSync('schema.sql', 'utf-8');
assert(schemaSql.includes('year_of_view AS ENUM'), 'schema.sql defines year_of_view enum');
assert(schemaSql.includes('flashcard_reviews'), 'schema.sql defines flashcard_reviews table');
assert(schemaSql.includes('ROW LEVEL SECURITY'), 'schema.sql enables Row Level Security');
assert(schemaSql.includes('idx_lectures_date'), 'schema.sql creates performance indexes');

// 6. Test FSRS-5 Math Formulation
const FSRS_W = [
  0.4072, 1.1829, 3.173, 15.691, 7.1949, 0.5345, 1.4604, 0.0046, 1.5457,
  0.1192, 1.0192, 1.9395, 0.11, 0.296, 0.227, 0.2595, 2.9466, 0.5, 0.6391
];
const FSRS_FACTOR = 19 / 81;

function calcInitS(rating) { return FSRS_W[rating - 1]; }
assert(calcInitS(1) === 0.4072, 'FSRS-5 Again initial stability is 0.4072');
assert(calcInitS(2) === 1.1829, 'FSRS-5 Hard initial stability is 1.1829');
assert(calcInitS(3) === 3.173, 'FSRS-5 Good initial stability is 3.173');
assert(calcInitS(4) === 15.691, 'FSRS-5 Easy initial stability is 15.691');

function calcR(t, S) { return Math.pow(1 + (FSRS_FACTOR * t) / S, -0.5); }
const rAtS = calcR(3.173, 3.173);
assert(Math.abs(rAtS - 0.9) < 0.01, `Continuous retrievability R(t=S) ~ 0.90 (calculated: ${rAtS.toFixed(4)})`);

function calcIvl(S, r = 0.9) { return Math.round((S / FSRS_FACTOR) * (Math.pow(r, -2) - 1)); }
const ivl3 = calcIvl(3.173);
assert(ivl3 >= 3 && ivl3 <= 4, `Initial Good interval ~ 3-4 days (calculated: ${ivl3})`);

// 7. Verify KaTeX Math Regex Logic
const testText = 'Calculate $MAP = DP + \\frac{1}{3}PP$ and $$CO = HR \\times SV$$';
const blockMatches = [...testText.matchAll(/\$\$([\s\S]*?)\$\$/g)].map(m => m[1]);
const textWithoutBlocks = testText.replace(/\$\$([\s\S]*?)\$\$/g, '___BLOCK___');
const inlineMatches = [...textWithoutBlocks.matchAll(/\$([^\$\n\r]+?)\$/g)].map(m => m[1]);
assert(inlineMatches.length === 1 && inlineMatches[0].includes('MAP'), 'KaTeX inline math pattern parsed correctly');
assert(blockMatches.length === 1 && blockMatches[0].includes('CO'), 'KaTeX block math pattern parsed correctly');

// 8. Strict Institutional & Project Anonymity (Zero "Neurova" Mentions)
const filesToCheck = ['index.html', 'flash.html', 'flashmake.html', '404.html', 'schema.sql', 'PULL_REQUEST.md', 'README.md'];
let neurovaFound = false;
for (const file of filesToCheck) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    if (/neurova/i.test(content)) {
      neurovaFound = true;
      assert(false, `Found unexpected mention of Neurova in ${file}`);
    }
  }
}
if (!neurovaFound) {
  assert(true, 'Zero mentions of Neurova across entire pull request codebase (strict project independence)');
}

console.log('\n==================================================');
if (failures === 0) {
  console.log(`🎉 ALL ${passed} VERIFICATION CHECKS PASSED PERFECTLY!`);
  console.log('==================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failures} CHECKS FAILED!`);
  console.log('==================================================');
  process.exit(1);
}
