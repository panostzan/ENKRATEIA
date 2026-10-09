export const WAIT = 8000;
export function createSession(approved, now = Date.now()) {
  return {version: 1, id: crypto.randomUUID(), startedAt: now, endedAt: null, approved,
    mode: 'away', since: now, segments: [], attempts: [], streaks: [], streakMs: 0,
    lastProductive: approved[0], grant: null, pending: null, checkpoint: now};
}
export function transition(s, mode, now = Date.now(), breakStreak = false) {
  now = Math.max(now, s.since);
  if (s.mode !== mode || breakStreak) {
    const duration = now - s.since;
    if (duration) s.segments.push({kind: s.mode, start: s.since, end: now});
    if (s.mode === 'focus') s.streakMs += duration;
    if (breakStreak && s.streakMs > 0) { s.streaks.push(s.streakMs); s.streakMs = 0; }
    s.mode = mode; s.since = now;
  }
  s.checkpoint = now;
}
export function finish(s, now = Date.now(), reason = 'ended') {
  transition(s, 'ended', now, true); s.endedAt = now; s.endReason = reason;
  for (const a of s.attempts) if (!a.choice) {a.choice = 'dismissed'; a.resolvedAt = now;}
  s.pending = null; s.grant = null; return s;
}
export function metrics(s, now = Date.now()) {
  const end = s.endedAt ?? now;
  const segments = [...s.segments];
  if (s.endedAt === null && end > s.since) segments.push({kind:s.mode,start:s.since,end});
  const focused = segments.filter(x=>x.kind==='focus').reduce((n,x)=>n+x.end-x.start,0);
  const current = s.streakMs + (s.mode === 'focus' ? end-s.since : 0);
  const streaks = [...s.streaks, ...(current > 0 ? [current] : [])];
  const elapsed = Math.max(0,end-s.startedAt);
  return {metricsVersion: 1, duration: elapsed, focused,
    attemptsPerHour: elapsed > 0 ? s.attempts.length * 3600000 / elapsed : null,
    focusPercentage: elapsed > 0 ? 100 * focused / elapsed : null, average: streaks.length ? streaks.reduce((a,b)=>a+b,0)/streaks.length : 0,
    longest: Math.max(0,...streaks), attempts: s.attempts.length,
    resistance: s.attempts.length ? Math.round(100*s.attempts.filter(a=>a.choice==='stay').length/s.attempts.length) : null, segments};
}
