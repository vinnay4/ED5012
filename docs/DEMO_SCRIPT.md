# FormDrift: Google Meet demo script (about 8 minutes, plus Q&A)

Everything runs in one browser tab: the slides are in the app (`#/present`) and the demo cards on slide 8 open the live analysis.

## Before the call (10 minutes earlier)

1. Open the app in **Google Chrome**: the deployed URL, or locally with `npm run build && npm run preview`, then http://localhost:4173.
2. Click through **Analyse → Fatigue set: side camera → Analyse this set** once. This warms the cache, so everything works even if the Wi-Fi drops.
3. Close other tabs and notifications. Set browser zoom to 100 %. Turn up the laptop volume (the cues are spoken).
4. Open **Present** in the top nav. You are on slide 1.
5. In Meet: **Present now → A tab → choose the FormDrift tab → tick "Also share tab audio"**. Sharing the tab, not the whole screen, lets the audience hear the spoken cues.
6. Press **F** for fullscreen slides. Use **← →** to move between slides; **Esc** leaves fullscreen.

Backup: if the tab misbehaves, reload it (everything is cached). If the internet fails, use the local `npm run preview` copy. Keep the [report](REPORT.md) open in another window for questions.

---

## Script

### 0:00 · Slide 1: Title (20 s)

> "Hi, I'm Vinnay. My ED5012 project is in Intelligent Sports. It's called **FormDrift**: a Progressive Web App that detects when your exercise technique starts to drift during a set, something lifters usually can't perceive themselves."

### 0:20 · Slide 2: The human issue (50 s)

> "Rep 1 feels the same as rep 9, but it isn't. Three human reasons. One: when you train alone you can't see your own form. Two: fatigue blunts proprioception, your joint-position sense, exactly when technique slips. Three: the drift is gradual. Depth drops a few percent and the chest dips a few degrees per rep, so no single rep feels wrong. The result is that unsupervised lifters train the last reps of every set with degraded technique."

### 1:10 · Slide 3: The two checks (30 s)

> "The two mandatory checks. Is it a human issue? Yes: perception, fatigue, individual body differences, and limited attention during effort. Can it be a PWA? Yes, and I'll show it. Pose estimation runs in the browser with WebAssembly, cues use the browser's speech and vibration APIs, it installs and works offline, and no video leaves the device."

### 1:40 · Slide 4: 4W1H (40 s)

> "Who: recreational lifters training alone, with very different body proportions. When and where: the mid-to-late reps of a set, phone on the floor, user mid-effort and not looking at the screen. What: depth loss, trunk lean, knee collapse, hip shift and slowing speed. How: a personal baseline from your own first reps, drift detection, one short cue per rep, and an evidence-based summary afterwards."

### 2:20 · Slides 5–7: HF levels 1–3 (70 s, about 25 s each)

- **Anthropometry:** "There is no universal correct squat. A long femur forces more lean, so FormDrift never uses textbook angles. It compares you with *your own* first reps and normalises depth by your measured leg length."
- **Biomechanics:** "Each metric is only measured where a 2D camera supports it: side view for depth and trunk lean, front view for the knees and hips. A static L5/S1 model after Chaffin turns extra lean into spinal compression."
- **Information handling:** "The user is under load, so at most one cue per rep, given at the top and never at the bottom, in two words with an external focus. Safety comes first, a cooldown stops nagging, and it escalates once to 'End the set'. You can pick audio, haptic, visual or silent mode."

### 3:30 · Slide 8 → LIVE DEMO (about 3.5 minutes)

**1. Click "Fatigue set · side".**

> "This is a simulated set: a digital mannequin with fatigue faults injected, so we know the ground truth. It's clearly labelled 'Simulated data'."

**2. Click "Analyse this set".**

> "It segments reps, builds a baseline from the first three, and compares every later rep with it."

**3. When the self-perception check appears, ask the audience or click "No change".**

> "Before showing results, it asks when *you* think form slipped. This measures the awareness gap. Here it says drift actually began at rep 6."

**4. Press "Play"** (optionally set speed to **1.5×**). Let it run through rep 7 to about rep 9 and point out:

- the rep counter top left and the status ring: purple while calibrating, then green, amber and red;
- spoken cues: **"Baseline set"**, **"Sit deeper"**, **"Chest up"**, then **"End the set"**;
- the athlete view has no numbers. Toggle **Analyst** to show the live numbers for us.

**5. Scroll to the Overview.**

> "Form score per rep falls from about 97 to 16, with a clear trend. Drift onset is rep 6 and velocity loss passed 20 % at rep 6. Each issue card says what changed, why it matters biomechanically, and what drill to do."

**6. Click the "Feedback log" tab.**

> "Every cue the engine considered, including the ones it held back and why, which makes the information-handling rules visible."

**7. Click the "Ground truth" tab.**

> "Because it's simulated, we can check it: 10 of 10 reps, and precision and recall of 100 % against the true values."

**8. Press the browser Back button once to return to the slide, then click "Kettlebell squat · real". Click "Analyse this set", then "No change".**

> "Now a real, Creative Commons video measured with MediaPipe. The lifter's technique is consistent, so the right answer is no alarms, and that's what we get: all 6 reps counted and no false alarms. False alarms erode trust and add workload."

**9. Click the "Biomechanics" tab.**

> "Here's the estimated L5/S1 compression per rep, against the NIOSH action limit, and the tempo chart showing the bottom pause growing in reps 5 and 6."

**10. (Optional, 20 s.) Return to the slide and click "Barbell squat · oblique" → Analyse.**

> "Filmed at an angle, the app detects the oblique view and marks trunk lean and valgus as *not measurable* instead of guessing."

If asked whether the landmarks are real, open the barbell clip (the shortest, 14 s) and click **Re-extract live with MediaPipe**. It reruns pose estimation in the browser, typically in 10–30 s on a laptop, and reproduces the same result. **Cancel** stops it at any time.

### 7:00 · Slide 9: Functional evaluation (30 s)

> "On the simulated sets, F1 is 1.0, depth error under 1 % of leg length and trunk-lean error under 1°. Rep counting is 10 of 10 on real video with zero false alarms. With up to 10 pixels of landmark noise, F1 stays above 0.9. All of these numbers are computed live on the Validation page."

### 7:30 · Slide 10: Aesthetic and usability (25 s)

> "The interface is calm and glanceable, and honest: everything is labelled real, simulated or uploaded. There's a built-in study toolkit with SUS and NASA-TLX and a within-subjects protocol."

### 7:55 · Slide 11: Limitations (25 s)

> "A single 2D camera, thresholds not yet calibrated by experts, and the simulation validates the pipeline rather than real fatigue. The next step is running the built-in study and a live camera mode."

### 8:20 · Slide 12: Thank you → Q&A

---

## Likely questions and short answers

**Isn't the simulated data cheating?**
It is labelled as simulated everywhere. Its purpose is functional evaluation: it is the only way to know the *true* depth and lean and to compute precision, recall and error. The real clips show that the same pipeline works on real MediaPipe output.

**Why not real-time camera feedback?**
The brief prioritised a reliable, hardware-free demo. The analysis already runs per frame and the cue engine is designed for live use (cues fire at rep end), so live mode is an extension rather than a redesign.

**How accurate is MediaPipe?**
It is good for sagittal angles in clear side views, but it degrades with occlusion, baggy clothing and backlighting. FormDrift reports detection rate, visibility and per-rep confidence, and never flags low-confidence reps.

**Why a personal baseline instead of ideal angles?**
Anthropometry. Femur-to-torso ratio changes the correct trunk angle, so a fixed limit misjudges people. Within-person change is also exactly what fatigue produces.

**How did you choose the 15 % / 30 % thresholds?**
Baseline-drift bands from prior work (RehabFlow), angles of 8°/15° for trunk lean, and a velocity-loss cut-off around 20 % from the velocity-based-training literature. Calibrating them against expert ratings (Fitness-AQA) is future work.

**Privacy?**
Video never leaves the browser. There is no server, and the profile and study data stay in local storage.

**What did you reuse?**
MediaPipe (Apache-2.0) as a dependency, and ideas from TechnIQ (MIT). Repositories without a licence (RehabFlow, wwm, FormGuard) were credited for ideas only; no code was copied. The demo videos are CC BY-SA 4.0 and attributed in the app.
