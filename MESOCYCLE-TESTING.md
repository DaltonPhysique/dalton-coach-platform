# Mesocycle Training — Testing Guide

**One-time setup:** run `supabase/mesocycle-migration.sql` in the Supabase SQL editor
(same as before — paste, run). Until it's run, everything below degrades gracefully:
the Train tab shows the old plan view, and the Templates page shows an empty list.

## Coach flow (do this first)

1. **Command Center → 🏋️ Templates → + New Template**
   - Name it (e.g. "Hypertrophy Block 1"), pick 4–6 weeks.
   - Add training days ("Upper A", "Lower A"…). Per exercise: sets, rep min/max,
     target RIR, and a starting weight (week 1 — the app progresses from there).
   - Save. Edit/delete anytime from the list.

2. **Open your client → Mesocycle tab → assign the template** with a start date.
   - The client's Train tab switches to the mesocycle view immediately.

3. **Back in the Mesocycle tab after the client logs:** you'll see Week X of Y,
   a volume-per-week bar chart, per-session logged-vs-programmed % for the
   current week, and red stall flags for lifts that haven't gone up in 2+ weeks.

## Client flow (Train tab)

1. Header shows **Week X of Y**, volume trend bars, and a deload countdown.
2. Pick the session day tab. Each exercise shows its prescription, e.g.
   `3 × 8–12 @ RIR 2 · 140 lb`, plus a note like "earned the bump ↑".
3. **Log each set:** weight / reps / RIR are pre-filled — one tap on Log.
   Logged sets turn into a green ✓ line.
4. **Progression rules** (automatic, next week):
   - Topped the rep range on every set at target RIR → +5 lb upper / +10 lb lower
   - In range but didn't top out → +2.5 lb
   - Below range or RIR blown → same weight next week
5. **Final week = deload:** gold "Deload week — trust it" banner, half the sets,
   60% weight, RIR 3. After the last week: "Mesocycle complete."

## Things to verify

- [ ] Template builder saves and the template appears in the list
- [ ] Assigning to the client flips their Train tab to the mesocycle view
- [ ] Logging a set shows the ✓ and persists after refresh
- [ ] Coach Mesocycle tab shows the volume bars and adherence %
- [ ] Ending the mesocycle returns the client Train tab to the regular plan view
- [ ] A client with NO mesocycle still sees the old training-plan display

## Known v1 limits (deliberate)

- No MEV/MAV/MRV volume landmarks, no fatigue questionnaires, no rest timers.
- Lower/upper classification is keyword-based (squat/deadlift/leg press… = lower,
  everything else = upper). Check the +10/+5 bumps feel right for your lifts.
- One active mesocycle per client — assigning a new one completes the old.
