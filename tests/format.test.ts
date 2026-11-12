import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unitFmt, unitsFrom } from '../src/lib/format';
import { GLOSSARY, annotate } from '../src/lib/glossary';
import { KB } from '../src/lib/knowledge';

test('units follow the Garmin profile', () => {
  assert.equal(unitsFrom('statute_us'), 'imperial');
  assert.equal(unitsFrom('metric'), 'metric');
  assert.equal(unitsFrom(null), 'metric');
});

test('metric and imperial formatting', () => {
  const m = unitFmt('metric'), i = unitFmt('imperial');
  assert.equal(m.dist(10000), '10.00 km');
  assert.equal(i.dist(1609.344), '1.00 mi');
  assert.equal(m.paceOrSpeed('running', 1000 / 300), '5:00 /km');
  assert.equal(i.paceOrSpeed('running', 1609.344 / 480), '8:00 /mi');
  assert.equal(m.paceOrSpeed('lap_swimming', 1), '1:40 /100m');
  assert.equal(m.paceOrSpeed('cycling', 10), '36.0 km/h');
  assert.equal(i.paceOrSpeed('cycling', 10), '22.4 mph');
  assert.equal(m.paceOrSpeed('running', 0), '–');
  assert.equal(i.weight(100), '220.5 lb');
  assert.equal(i.elev(100), '328 ft');
});

test('glossary: terms are found, prose is left alone', () => {
  const keys = (t: string) => annotate(t).filter((p) => typeof p !== 'string').map((p: any) => p.key);
  assert.deepEqual(keys('Acute load against chronic load'), ['acute', 'chronic']);
  assert.deepEqual(keys('Overnight HRV vs baseline'), ['hrv', 'baseline']);
  assert.deepEqual(keys('Resting heart rate'), ['rhr']);
  assert.deepEqual(keys('frequent deep overnight dips at an easy pace'), []);
  assert.deepEqual(keys('HRV and HRV again'), ['hrv'], 'each term is marked once per text');
  assert.equal(annotate('plain text').join(''), 'plain text');
});

test('every glossary and knowledge entry is complete', () => {
  for (const [k, e] of Object.entries(GLOSSARY)) assert.ok(e.term && e.def.length > 20 && e.match.length, k);
  for (const [k, e] of Object.entries(KB)) assert.ok(e.what.length > 40 && e.read.length > 40 && e.improve.length >= 2, k);
});
