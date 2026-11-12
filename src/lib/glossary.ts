// Plain-language definitions for every term the dashboard uses.
// `match` lists the spellings that should be recognised in on-screen text (case-insensitive, whole words).
export type GlossaryEntry = { term: string; def: string; match: string[] };

export const GLOSSARY: Record<string, GlossaryEntry> = {
  hrv: { term: 'HRV (heart rate variability)', match: ['heart rate variability', 'overnight HRV', 'HRV'],
    def: 'The tiny variation in time between heartbeats, measured in milliseconds while you sleep. Higher than your own normal means well recovered; lower means your body is under strain. It is personal: never compare with someone else.' },
  rhr: { term: 'Resting heart rate (RHR)', match: ['resting heart rate', 'resting HR', 'RHR'],
    def: 'Your lowest steady heart rate of the day, in beats per minute. It falls as fitness improves, and rises for a few days with fatigue, illness, alcohol or stress.' },
  readiness: { term: 'Readiness', match: ['morning readiness', 'readiness score', 'readiness'],
    def: 'This dashboard\'s 0–100 score for how recovered you are today, built from HRV (40%), sleep score (35%) and resting heart rate (25%) compared with your own last 30 days. 75+ is ready for hard training; under 55 means take it easy.' },
  bodyBattery: { term: 'Body Battery', match: ['Body Battery'],
    def: 'Garmin\'s 0–100 estimate of your energy reserves. Sleep and calm rest charge it; activity and stress drain it.' },
  stress: { term: 'Stress level', match: ['stress level', 'stress breakdown', 'Stress', 'average stress', 'daytime stress', 'daily stress', 'sleep stress', 'overnight stress', 'stress during sleep'],
    def: 'Garmin\'s 0–100 reading of how activated your nervous system is, estimated from heart rhythm when you are not exercising. 0–25 rest, 26–50 low, 51–75 medium, 76–100 high. It reacts to caffeine, food, illness and training as well as mental stress.' },
  baseline: { term: 'Baseline', match: ['30-day baseline', 'baseline'],
    def: 'Your own recent normal, usually the average of the last 30 days. Comparing against it shows whether today is unusual for you.' },
  rolling: { term: 'Rolling average', match: ['7-day rolling average', 'rolling average', '7-day average', '7d avg', '7-night average', '28-night', '28-day average'],
    def: 'The average of the most recent days, recalculated every day. It smooths out single-day noise so the real trend is visible.' },
  balanced: { term: 'Balanced range', match: ['balanced range'],
    def: 'The band Garmin calculates as your normal HRV, from about three weeks of your own nights. Inside it is normal; below it for several days signals strain.' },
  trainingLoad: { term: 'Training load', match: ['training load', 'activity load', 'Load'],
    def: 'A number for how much stress a workout put on your body, combining how long and how hard it was (based on heart rate). A hard hour scores far more than an easy hour.' },
  acute: { term: 'Acute load', match: ['acute load', 'acute (7 days)', 'acute'],
    def: 'Your total training load over the last 7 days: what you have done lately.' },
  chronic: { term: 'Chronic load', match: ['chronic load', 'chronic (28-day weekly avg)', 'chronic'],
    def: 'Your average weekly training load over the last 28 days: what your body is currently used to.' },
  loadRatio: { term: 'Acute-to-chronic ratio', match: ['acute-to-chronic ratio', 'load ratio'],
    def: 'Acute load divided by chronic load. Around 1.0 means this week matches your usual; 0.8–1.3 builds fitness safely; above 1.5 is a sudden jump linked with injury and illness.' },
  te: { term: 'Training effect (TE)', match: ['training effect', 'TE'],
    def: 'Garmin\'s 0–5 rating of how much a workout improved your fitness. Under 2 is recovery, 2–3 maintains, 3–4 improves, 4–5 is highly demanding.' },
  aerobic: { term: 'Aerobic', match: ['aerobic base', 'aerobic'],
    def: 'Effort your body can fuel with oxygen and sustain for a long time, such as easy running or steady cycling. It builds endurance.' },
  anaerobic: { term: 'Anaerobic', match: ['anaerobic'],
    def: 'Short, very hard effort beyond what oxygen alone can fuel, such as sprints or heavy intervals. It builds speed and power and needs more recovery.' },
  intensity: { term: 'Intensity minutes', match: ['intensity minutes', 'intensity goal'],
    def: 'Minutes of moderate activity plus double credit for vigorous activity. The health guideline is at least 150 a week.' },
  vigorous: { term: 'Moderate and vigorous', match: ['vigorous', 'moderate-equivalent'],
    def: 'Moderate activity raises your breathing but you can still talk (brisk walking). Vigorous activity makes talking in full sentences difficult (running, hard cycling).' },
  zones: { term: 'Heart-rate zones', match: ['heart-rate zones', 'heart-rate zone', 'heart rate zones', 'zones 1–2', 'zones 4–5', 'zone time', 'Z1–2', 'Z4–5', 'Z3', 'zone 3'],
    def: 'Five effort bands based on your maximum heart rate. Zone 1 very easy, zone 2 easy and conversational, zone 3 moderate, zone 4 hard, zone 5 maximal.' },
  zone2: { term: 'Zone 2', match: ['zone 2'],
    def: 'Easy effort where you can hold a full conversation, roughly 60–70% of maximum heart rate. Most endurance fitness is built here.' },
  polarized: { term: 'Polarized training (80/20)', match: ['polarized training', 'polarized', '80/20', '80 / 20', 'intensity distribution'],
    def: 'Doing about 80% of training easy and 20% hard, with little in the middle. Research finds this builds more fitness with less fatigue than training at medium effort all the time.' },
  efficiency: { term: 'Aerobic efficiency', match: ['aerobic efficiency', 'efficiency'],
    def: 'How much speed or power you produce per heartbeat (speed or watts divided by average heart rate). Rising over weeks means your aerobic fitness is improving.' },
  vo2: { term: 'VO2 max', match: ['VO2 max', 'VO2max'],
    def: 'The most oxygen your body can use per minute per kilogram of body weight. The standard measure of cardio fitness; higher is fitter.' },
  fitnessAge: { term: 'Fitness age', match: ['fitness age'],
    def: 'Garmin\'s estimate of the age your fitness level matches. Lower than your real age is good.' },
  cadence: { term: 'Cadence', match: ['cadence', 'spm'],
    def: 'Steps per minute when running (spm), or pedal revolutions per minute when cycling. Easy running is typically 160–180 spm.' },
  gct: { term: 'Ground contact time', match: ['ground contact time', 'ground contact'],
    def: 'How long each foot stays on the ground per step, in milliseconds. Shorter usually means a more efficient, springier stride.' },
  vertOsc: { term: 'Vertical oscillation', match: ['vertical oscillation'],
    def: 'How much your torso bounces up and down with each running step, in centimetres. Less bounce means more energy goes forward.' },
  vertRatio: { term: 'Vertical ratio', match: ['vertical ratio'],
    def: 'Bounce height divided by stride length, as a percentage. Lower is more efficient; under about 8% is good.' },
  stride: { term: 'Stride length', match: ['stride length'],
    def: 'The distance covered by one running step.' },
  gap: { term: 'Grade-adjusted pace', match: ['grade-adjusted pace'],
    def: 'Your pace corrected for hills: the pace the same effort would have produced on flat ground.' },
  pace: { term: 'Pace', match: ['avg / best pace', 'pace'],
    def: 'Time taken to cover one kilometre or mile. A lower number is faster.' },
  power: { term: 'Power', match: ['normalized power', 'power'],
    def: 'The rate of work you are producing, in watts. Unlike heart rate it responds instantly to effort.' },
  deep: { term: 'Deep sleep', match: ['deep sleep', 'Deep \\+ REM share', 'Deep'],
    def: 'The stage of slow brain waves when physical repair and growth-hormone release peak. Mostly in the first half of the night; typically 13–23% of sleep.' },
  rem: { term: 'REM sleep', match: ['REM sleep', 'REM'],
    def: 'Rapid-eye-movement sleep, when most dreaming happens. It supports memory, learning and mood, and comes mostly in the last hours of the night; typically 20–25% of sleep.' },
  light: { term: 'Light sleep', match: ['light sleep'],
    def: 'The transitional stage that makes up about half the night. Normal and necessary, but less restorative than deep or REM.' },
  sleepScore: { term: 'Sleep score', match: ['sleep score'],
    def: 'Garmin\'s 0–100 rating of a night: 90+ excellent, 80–89 good, 60–79 fair, under 60 poor. It combines duration, stages, awakenings and overnight stress.' },
  sleepNeed: { term: 'Sleep need', match: ['sleep need'],
    def: 'How much sleep Garmin estimates you needed that night. It rises after hard training or previous short nights.' },
  restless: { term: 'Restlessness', match: ['restlessness', 'awakenings'],
    def: 'How much you moved or briefly woke during the night. Fewer and shorter interruptions mean more restorative sleep.' },
  spo2: { term: 'SpO2 (blood oxygen)', match: ['blood oxygen', 'SpO2'],
    def: 'The percentage of your blood carrying oxygen. 95–100% is normal at sea level.' },
  respiration: { term: 'Respiration rate', match: ['respiration rate', 'respiration', 'brpm'],
    def: 'Breaths per minute (brpm). Typically 12–20 when awake and a little lower asleep; a rise above your normal can signal illness or fatigue.' },
  bmi: { term: 'BMI', match: ['BMI'],
    def: 'Body mass index: weight divided by height squared. 18.5–24.9 is the standard healthy range, though it overstates fatness in muscular people.' },
  bodyFat: { term: 'Body fat', match: ['body fat'],
    def: 'The share of your weight that is fat, estimated by a smart scale. Readings shift with hydration, so follow the trend.' },
  hr: { term: 'Heart rate', match: ['Avg / max HR', 'Avg HR', 'sleeping heart rate', '24-hour heart rate', 'overnight heart rate'],
    def: 'How many times your heart beats per minute (bpm). Average HR is the mean across the activity or period; max HR is the highest value reached.' },
  bpm: { term: 'bpm', match: ['bpm'], def: 'Beats per minute: how fast your heart is beating.' },
  kcal: { term: 'Active and resting calories', match: ['active vs resting calories', 'resting calories', 'active calories'],
    def: 'Resting calories are what your body burns just staying alive. Active calories are the extra burned by movement and exercise.' },
  correlation: { term: 'Correlation (r)', match: ['correlation', 'r ='],
    def: 'A number from −1 to +1 showing how closely two things move together. Near 0 means no link; ±0.3 is weak, ±0.5 moderate, ±0.7 strong. It does not prove one causes the other.' },
  pr: { term: 'Personal record', match: ['personal record'], def: 'Garmin flagged this activity as containing one of your best-ever performances.' },
  elev: { term: 'Elevation gain', match: ['elevation gain', 'Elev'], def: 'Total height climbed during the activity, counting only the uphill parts.' },
  splits: { term: 'Splits', match: ['splits', 'Lap'], def: 'The activity broken into sections (laps), so you can see how pace, heart rate and power changed along the way.' },
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]]/g, (m) => (m === '\\' ? m : `\\${m}`));
// Longest spellings first so "resting heart rate" wins over "heart rate".
const ALL = Object.entries(GLOSSARY).flatMap(([key, e]) => e.match.map((m) => ({ key, m }))).sort((a, b) => b.m.length - a.m.length);
const RE = new RegExp(`(?<![\\w-])(${ALL.map((x) => (x.m.includes('\\') ? x.m : esc(x.m))).join('|')})(?![\\w-])`, 'gi');
const LOOKUP = new Map(ALL.map((x) => [x.m.replace(/\\/g, '').toLowerCase(), x.key]));

const EXACT_SPELLINGS = new Set(['Deep', 'TE', 'Lap', 'Elev', 'REM', 'BMI', 'HRV', 'RHR', 'Load', 'Pace', 'Power', 'Efficiency', 'Stress', 'Readiness', 'Splits']);
const EXACT = new Set([...EXACT_SPELLINGS].map((x) => x.toLowerCase()));

/** Splits text into plain strings and glossary hits. Each term is marked once per text. */
export function annotate(text: string): (string | { key: string; text: string })[] {
  const out: (string | { key: string; text: string })[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const key = LOOKUP.get(m[0].toLowerCase());
    if (!key || seen.has(key)) continue;
    if (EXACT.has(m[0].toLowerCase()) && !EXACT_SPELLINGS.has(m[0])) continue; // short labels must match case, so prose like "deep dips" is left alone
    seen.add(key);
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push({ key, text: m[0] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
