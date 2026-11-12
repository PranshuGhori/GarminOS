// What each metric means, how to read it, and what moves it.
// Plain module: used by the Coach page (server) and by chart help text (client).
// General wellness guidance, not medical advice.

export type MetricKey =
  | 'readiness' | 'hrv' | 'restingHr' | 'bodyBattery' | 'stress' | 'respiration' | 'spo2'
  | 'sleepDuration' | 'sleepScore' | 'sleepStages' | 'sleepConsistency'
  | 'steps' | 'intensity' | 'load' | 'polarization' | 'efficiency' | 'vo2max' | 'fitnessAge' | 'runningForm'
  | 'weight' | 'hydration';

export type Knowledge = { title: string; group: 'Recovery' | 'Sleep' | 'Training' | 'Body'; what: string; read: string; improve: string[]; needs?: string };

export const KB: Record<MetricKey, Knowledge> = {
  readiness: {
    title: 'Morning readiness', group: 'Recovery',
    what: 'A single 0–100 score this app computes each morning from three recovery signals: overnight HRV (40%), sleep score (35%) and resting heart rate (25%). HRV and resting HR are judged against your own last 30 days, so the score describes how recovered you are relative to your normal, not relative to other people.',
    read: '75 or more: recovered, a good day for hard or long training. 55–74: normal, train as planned. Below 55: one or more signals are off; favour easy movement, and look at which component dropped. One low day means little. Three or more in a row usually has a cause: accumulated training, short sleep, illness coming on, alcohol, travel or life stress.',
    improve: [
      'Find the weak component first (HRV, sleep or resting HR) and fix that one; the score follows.',
      'Place hard sessions on high-readiness days and easy ones on low days rather than following a fixed calendar.',
      'Protect the night before key sessions: no alcohol, last big meal 3 hours before bed, usual bedtime.',
    ],
  },
  hrv: {
    title: 'Heart rate variability (HRV)', group: 'Recovery',
    what: 'The beat-to-beat variation in your heart rhythm during sleep, in milliseconds. It reflects the balance of your autonomic nervous system: higher HRV means the "rest and digest" side is dominant and your body has capacity to adapt; lower HRV means it is busy dealing with something (training, stress, illness, alcohol, poor sleep).',
    read: 'HRV is highly individual, ranging from the 20s to over 100 ms in healthy adults, and falls with age. Never compare your number with someone else\'s. Compare your 7-day average with your own baseline: inside the balanced band is normal; below it for several days signals strain you have not absorbed; an unusually high spike can also follow extreme fatigue. The trend over weeks matters more than any single night.',
    improve: [
      'Build aerobic base: regular easy (zone 2) training is the most reliable long-term way to raise HRV.',
      'Keep sleep timing regular; irregular bedtimes lower HRV even when total sleep is adequate.',
      'Alcohol suppresses overnight HRV for one to two nights, even in moderate amounts. Test a dry week and watch the line.',
      'Finish hard training and large meals at least 3 hours before bed so your heart rate can settle early in the night.',
      'Slow breathing (about 6 breaths a minute for 5–10 minutes) raises HRV acutely and helps on stressful days.',
      'When your 7-day average sits below baseline, cut intensity for a few days rather than pushing through.',
    ],
    needs: 'a watch with HRV Status, worn overnight for about three weeks to establish a baseline',
  },
  restingHr: {
    title: 'Resting heart rate', group: 'Recovery',
    what: 'Your lowest sustained heart rate of the day, usually reached during sleep. It reflects how efficiently your heart supplies your body at rest: a stronger, fitter heart pumps more per beat and needs fewer beats.',
    read: 'For adults 60–100 bpm is the clinical normal range; regularly active people are typically 50–65 and endurance-trained people 40–55. More useful than the absolute value is the change against your own baseline: a rise of 3–5 bpm or more for a few days commonly means incomplete recovery, dehydration, heat, alcohol, stress or an oncoming illness. A slow downward drift over months is a sign of improving fitness.',
    improve: [
      'Consistent aerobic training lowers resting HR over weeks to months; aim for 150+ minutes a week of zone 2.',
      'Hydrate through the day; mild dehydration raises heart rate.',
      'Limit alcohol and late caffeine, both of which keep overnight heart rate elevated.',
      'Treat an unexplained multi-day rise as a signal to back off and sleep more.',
    ],
  },
  bodyBattery: {
    title: 'Body Battery', group: 'Recovery',
    what: 'Garmin\'s 0–100 estimate of your energy reserves. It charges when HRV indicates recovery (mainly sleep, also naps and calm rest) and drains with activity and stress. It is derived from HRV, stress, sleep and activity.',
    read: 'The morning peak tells you how well the night recharged you: 75+ is a full charge, 50–74 partial, under 50 a poor recharge. Compare daily charged versus drained: if you drain more than you charge several days running you are building a deficit. Ending most days below 20 means there is little left in reserve.',
    improve: [
      'The biggest lever is sleep: longer and more consistent nights raise the morning peak.',
      'Insert genuine rest periods in the day (a walk without the phone, 10 minutes of slow breathing, a short nap before 3 pm); these register as recharge.',
      'Watch the Body Battery events list on the Overview page to see which activities cost you the most and schedule them when you start the day high.',
      'Alcohol and late heavy meals flatten the overnight charge.',
    ],
  },
  stress: {
    title: 'Stress level', group: 'Recovery',
    what: 'Garmin\'s 0–100 estimate of physiological stress from heart rate variability while you are not exercising. It measures how activated your nervous system is, whatever the cause: mental pressure, caffeine, digestion, heat, illness or recovery from training all look the same.',
    read: '0–25 is rest, 26–50 low, 51–75 medium, 76–100 high. A daily average under about 35 with many hours in "rest" is a calm day. What matters most is whether you get enough rest time to offset the stress time, and whether stress stays elevated during sleep.',
    improve: [
      'Add short deliberate recovery breaks: 5 minutes of slow nasal breathing drops stress within minutes and counts as rest time.',
      'Move caffeine earlier; it raises measured stress for 6+ hours.',
      'Large meals and alcohol raise stress for hours afterwards; lighter, earlier dinners lower evening and sleep stress.',
      'Regular easy aerobic exercise lowers resting stress over weeks; too much hard training raises it.',
      'If stress is high during sleep, look at late eating, alcohol, room temperature and late screens first.',
    ],
  },
  respiration: {
    title: 'Respiration rate', group: 'Recovery',
    what: 'Breaths per minute, estimated from heart rhythm. It is one of the most stable vital signs, which makes changes informative.',
    read: 'Typical adults sit at 12–20 breaths per minute awake and a little lower asleep. Your own number barely moves from night to night, so a rise of 1–2 breaths per minute above your baseline is notable and often shows up with illness, heavy training fatigue, alcohol or altitude.',
    improve: [
      'Aerobic fitness and nasal breathing lower resting respiration slightly over time.',
      'Use it as an early-warning signal rather than a target: a sustained rise alongside higher resting HR is a reason to rest.',
    ],
  },
  spo2: {
    title: 'Blood oxygen (SpO2)', group: 'Recovery',
    what: 'The percentage of haemoglobin carrying oxygen, estimated optically at the wrist. Wrist readings are less accurate than a fingertip medical oximeter and are sensitive to fit, movement and skin temperature.',
    read: 'At sea level 95–100% is normal. Readings fall with altitude and can dip during sleep. Occasional low values are usually measurement noise. Averages persistently below about 92% at low altitude, or frequent deep overnight dips together with snoring or daytime sleepiness, are worth raising with a doctor.',
    improve: [
      'Wear the watch snug and a little higher on the wrist at night for cleaner readings.',
      'At altitude, ascend gradually and expect values to recover over days as you acclimatise.',
      'This is a signal to check, not something to train directly.',
    ],
    needs: 'a watch with a Pulse Ox sensor, with sleep or all-day Pulse Ox switched on',
  },
  sleepDuration: {
    title: 'Sleep duration', group: 'Sleep',
    what: 'Total time actually asleep (time awake in bed is excluded). Sleep is when most physical repair, hormonal regulation and memory consolidation happen, and it is the base every other recovery metric rests on.',
    read: 'Most adults need 7–9 hours; teenagers and people in heavy training need more. Garmin also computes a personal sleep need each night that goes up after hard training or short nights. Compare your average with that need: a regular shortfall of 30+ minutes a night accumulates into a debt that weekend lie-ins only partly repay.',
    improve: [
      'Set a fixed wake time seven days a week, then move bedtime earlier in 15-minute steps until you meet your need.',
      'Give yourself a wind-down of 30–60 minutes with dim light and no work.',
      'Keep the bedroom cool (about 17–19 °C / 63–66 °F), dark and quiet.',
      'Stop caffeine 8+ hours before bed; it shortens sleep even when you fall asleep easily.',
      'Get outdoor light within an hour of waking to anchor your body clock.',
    ],
  },
  sleepScore: {
    title: 'Sleep score', group: 'Sleep',
    what: 'Garmin\'s 0–100 rating of a night, combining duration against your need, time in each stage, awakenings and restlessness, and how much overnight stress (HRV) indicated real recovery.',
    read: '90–100 excellent, 80–89 good, 60–79 fair, below 60 poor. The score components on the Sleep page show which part held a night back: short duration, too little deep or REM, restlessness, or high overnight stress.',
    improve: [
      'Check the component breakdown and work on the lowest-rated one.',
      'If stress is the weak component: no alcohol, earlier and lighter dinner, and finish hard exercise 3+ hours before bed.',
      'If awakenings or restlessness: cooler room, less fluid in the last 2 hours, and review late caffeine.',
      'If duration: an earlier, more regular bedtime is the only fix.',
    ],
  },
  sleepStages: {
    title: 'Deep and REM sleep', group: 'Sleep',
    what: 'Deep sleep is when growth hormone release and physical repair peak; it is concentrated in the first half of the night. REM sleep supports learning, memory and mood; it is concentrated in the second half. Stage estimates from a watch are approximate, so look at trends rather than single nights.',
    read: 'Typical adults get roughly 13–23% deep and 20–25% REM (Garmin rates 16–33% deep and 21–31% REM as optimal). Deep sleep declines with age. Consistently low deep sleep often follows late alcohol, a warm room or an irregular schedule. Low REM usually comes from cutting the night short, because most REM comes in the final hours.',
    improve: [
      'For deep sleep: regular exercise (not right before bed), a cool room, and no alcohol, which fragments deep sleep in the first half of the night.',
      'For REM: sleep longer. Waking to an early alarm removes the REM-rich last cycle.',
      'A consistent schedule improves both, because the body anticipates each stage.',
    ],
  },
  sleepConsistency: {
    title: 'Sleep consistency', group: 'Sleep',
    what: 'How much your bedtime and wake time move around from night to night. Your body clock anticipates sleep; irregular timing works like repeated small doses of jet lag.',
    read: 'A bedtime that varies by less than about 30 minutes is very regular; 30–60 minutes is typical; more than an hour is irregular. Irregular sleep timing is linked with worse sleep quality, lower HRV and poorer metabolic health, independently of how long you sleep.',
    improve: [
      'Anchor the wake time first and keep it within 30 minutes on weekends.',
      'Set a wind-down alarm 45 minutes before your target bedtime.',
      'If you need to catch up, go to bed earlier rather than sleeping in later.',
    ],
  },
  steps: {
    title: 'Daily steps', group: 'Training',
    what: 'All-day movement outside of structured exercise. Low-intensity movement spread through the day supports metabolic health, blood sugar control and recovery in a way that a single workout does not replace.',
    read: 'Health benefits rise steeply up to around 7,000–8,000 steps a day and continue more gradually beyond 10,000. Under 5,000 is considered sedentary. Your Garmin goal adapts to what you have been doing.',
    improve: [
      'Attach walks to things you already do: 10 minutes after each meal also blunts blood-sugar spikes.',
      'Take calls and one meeting a day on foot.',
      'On rest days, use an easy 30–45 minute walk as active recovery.',
    ],
  },
  intensity: {
    title: 'Intensity minutes', group: 'Training',
    what: 'Weekly minutes of moderate activity plus double credit for vigorous activity. It mirrors the World Health Organization guideline for cardiovascular health.',
    read: 'The guideline is at least 150 moderate-equivalent minutes a week (75 vigorous). 150–300 is the recommended band, and benefits continue above 300. Falling short most weeks is the clearest sign your heart is not getting enough stimulus.',
    improve: [
      'Three 30-minute brisk sessions plus one longer one covers the guideline.',
      'Vigorous minutes count double: one interval session a week raises the total quickly.',
      'If strength training is your main activity, add short cardio finishers or brisk walks, since lifting often registers few intensity minutes.',
    ],
  },
  load: {
    title: 'Training load balance', group: 'Training',
    what: 'Acute load is what you did in the last 7 days; chronic load is your weekly average over the last 28. Their ratio shows whether you are doing more, the same or less than your body is currently adapted to.',
    read: 'A ratio of 0.8–1.3 is the range where fitness builds with manageable risk. Above 1.5 means a sharp jump in load, the pattern most associated with injury and illness. Below 0.8 for more than a week or two means you are detraining (which is fine for a planned recovery week or taper).',
    improve: [
      'Increase weekly load gradually, roughly 5–10% a week, and take an easier week every third or fourth.',
      'After a break, rebuild over as many weeks as you were away rather than resuming the old volume.',
      'If the ratio is above 1.3 and readiness is falling, swap the next hard session for an easy one.',
    ],
  },
  polarization: {
    title: 'Intensity distribution', group: 'Training',
    what: 'How your training time divides between low intensity (zones 1–2, conversational), moderate (zone 3) and high (zones 4–5). Endurance research consistently finds that spending most time easy, with a small amount truly hard, builds more fitness with less fatigue than doing everything at a medium effort.',
    read: 'A common target is about 80% low and 20% moderate-to-high. Much below 70% low usually means easy days are drifting too hard. Close to 100% low means there is no high-intensity stimulus, which limits VO2 max and speed gains.',
    improve: [
      'Keep easy sessions honestly easy: you should be able to speak in full sentences, typically below about 75% of maximum heart rate.',
      'Add one or two quality sessions a week, for example 4 × 4 minutes hard with 3 minutes easy, or 20 minutes at a comfortably hard tempo.',
      'Avoid the middle: sessions that are too hard to recover from quickly but too easy to drive adaptation.',
      'Check your heart-rate zones are set from a recent max or threshold value, otherwise the distribution is mislabelled.',
    ],
    needs: 'activities recorded with heart rate',
  },
  efficiency: {
    title: 'Aerobic efficiency', group: 'Training',
    what: 'Output per heartbeat: speed (or power) divided by average heart rate. When the same heart rate produces more speed or power than before, your aerobic system has improved.',
    read: 'Only compare like with like: similar route, terrain, temperature and effort type. A rising trend across several weeks of easy sessions is one of the best field signs of improving aerobic fitness. Heat, fatigue, dehydration and hills all lower it on the day.',
    improve: [
      'Accumulate easy zone 2 volume; this is what raises efficiency most.',
      'Run or ride a repeatable test route every few weeks at a fixed heart rate and compare pace or power.',
      'Within a session, heart rate drifting up at constant pace by more than about 5% suggests the effort was above your aerobic base or you were under-fuelled.',
    ],
    needs: 'activities with distance (or power) and heart rate',
  },
  vo2max: {
    title: 'VO2 max', group: 'Training',
    what: 'The maximum rate at which your body can use oxygen, in ml per kg per minute. It is the best single measure of cardiorespiratory fitness and one of the strongest predictors of long-term health. Garmin estimates it from the relationship between pace (or power) and heart rate.',
    read: 'It is strongly affected by age and sex, so use Garmin\'s age- and sex-based rating (poor to superior) in Garmin Connect for the category and use this dashboard for the trend. A change of 1–2 points over a couple of months is meaningful. The estimate needs outdoor runs or walks with GPS, or rides with a power meter, and reads low in heat or on trails.',
    improve: [
      'High-intensity intervals are the most effective stimulus: 4 × 4 minutes at about 90–95% of max heart rate, once or twice a week.',
      'Support them with plenty of easy volume; the base lets you absorb the hard work.',
      'Losing excess body fat raises the per-kilogram value directly.',
      'Be consistent for 8–12 weeks before judging; the estimate moves slowly.',
    ],
    needs: 'a compatible watch plus outdoor GPS runs/brisk walks of 10+ minutes, or cycling with a power meter',
  },
  fitnessAge: {
    title: 'Fitness age', group: 'Training',
    what: 'Garmin\'s estimate of the age your fitness corresponds to, built from VO2 max or activity level, resting heart rate, vigorous activity and body composition.',
    read: 'Below your actual age is good; the gap matters more than the number. Garmin also reports which component offers the biggest improvement, shown on the Trends page.',
    improve: [
      'Reach the vigorous-activity target Garmin shows (days and minutes per week).',
      'Lower resting heart rate through consistent aerobic training.',
      'Move body composition toward the healthy range if BMI or body fat is flagged.',
    ],
  },
  runningForm: {
    title: 'Running dynamics', group: 'Training',
    what: 'Cadence (steps per minute), ground contact time, vertical oscillation (bounce) and vertical ratio (bounce relative to stride length). Together they describe how economically you turn effort into forward motion.',
    read: 'These depend heavily on speed, so compare runs at similar pace. At easy running paces most people fall between 160 and 180 steps per minute; faster running shortens ground contact (elite runners are under 220 ms; recreational runners 250–300 ms). A vertical ratio under about 8% is efficient and above 10% suggests energy is going up rather than forward. Walking and run-walk sessions will show much lower cadence and longer contact and should not be judged against running norms.',
    improve: [
      'If you overstride (low cadence, heavy heel landing ahead of the body), raise cadence by about 5% using a metronome or music, keeping the same pace.',
      'Add 4–6 relaxed 20-second strides after two easy runs a week to practise quick, light contacts.',
      'Strength work for calves, glutes and hips (calf raises, single-leg work, hops) shortens ground contact over time.',
      'Change one thing at a time and give it several weeks.',
    ],
    needs: 'a watch or sensor that records running dynamics',
  },
  weight: {
    title: 'Weight and body composition', group: 'Body',
    what: 'Body weight, and where available body fat and muscle mass from a smart scale. Scale body-fat readings use electrical impedance and shift with hydration, so their trend is more reliable than any single reading.',
    read: 'Daily weight swings of 1–2 kg (2–4 lb) from water, salt and food are normal; judge the 2–4 week trend. BMI 18.5–24.9 is the standard healthy range but overstates fatness in muscular people; waist measurement and body-fat trend are better guides for them.',
    improve: [
      'Weigh at the same time each day (after waking, after the toilet) and look at the weekly average.',
      'For fat loss, a modest deficit with high protein (about 1.6–2.2 g per kg body weight) and regular strength training preserves muscle.',
      'A change of about 0.25–0.75% of body weight per week is a sustainable rate in either direction.',
    ],
    needs: 'weight logged in Garmin Connect or a connected smart scale',
  },
  hydration: {
    title: 'Hydration', group: 'Body',
    what: 'Fluid you have logged against Garmin\'s daily goal, which increases with sweat loss from recorded activities.',
    read: 'Even 2% body-weight dehydration raises heart rate and perceived effort and lowers HRV. Pale-yellow urine and stable morning weight are practical checks.',
    improve: [
      'Drink with each meal and carry a bottle; front-load the day so you are not catching up before bed.',
      'For sessions over an hour or in heat, drink during exercise and include sodium.',
      'Weigh before and after long sessions: each kilogram lost is about a litre to replace.',
    ],
    needs: 'fluid intake logged in Garmin Connect',
  },
};
