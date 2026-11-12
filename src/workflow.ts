export const activities = ['Travel', 'Work', 'Waiting', 'Break'] as const;
export const projects = ['Harbor Works', 'Northline Retrofit'] as const;
export type Activity = typeof activities[number];
export type Project = typeof projects[number];
type Signal = {
  id: string;
  minute: number;
  label: string;
  source: string;
  transition: Activity | 'Gap' | 'End';
  order: string;
  quality: 'Direct' | 'Corroborated' | 'Review';
};

export type Interval = {
  id: string;
  day: number;
  start: number;
  end: number;
  activity: Activity | 'Gap';
  project: Project;
  order: string;
  evidence: Signal[];
  confirmed: boolean;
  edited?: boolean;
};

export const monday: Signal[] = [
  { id: 'e1', minute: 480, label: 'Travel started', source: 'Technician check-in', transition: 'Travel', order: 'WO-4821', quality: 'Direct' },
  { id: 'e2', minute: 525, label: 'Waiting for site clearance', source: 'Site dispatch log', transition: 'Waiting', order: 'WO-4821', quality: 'Corroborated' },
  { id: 'e3', minute: 555, label: 'Work started', source: 'IFS work-order status', transition: 'Work', order: 'WO-4821', quality: 'Direct' },
  { id: 'e4', minute: 735, label: 'Work paused · reason missing', source: 'Technician check-in', transition: 'Gap', order: 'WO-4821', quality: 'Review' },
  { id: 'e5', minute: 765, label: 'Work resumed', source: 'Technician check-in', transition: 'Work', order: 'WO-4821', quality: 'Direct' },
  { id: 'e6', minute: 960, label: 'Work completed · return travel started', source: 'IFS work-order status + check-in', transition: 'Travel', order: 'WO-4821', quality: 'Direct' },
  { id: 'e7', minute: 1005, label: 'Return travel ended', source: 'Technician check-in', transition: 'End', order: 'WO-4821', quality: 'Direct' },
];

export const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const dates = ['09 Nov', '10 Nov', '11 Nov', '12 Nov', '13 Nov'];

export function reconstruct(signals: Signal[], day: number, project: Project): Interval[] {
  const unique = new Map<string, Signal>();
  for (const signal of signals) {
    if (!unique.has(signal.id)) unique.set(signal.id, signal);
  }
  const sorted = [...unique.values()].sort((a, b) => a.minute - b.minute || a.id.localeCompare(b.id));
  const intervals: Interval[] = [];
  for (let index = 0; index < sorted.length - 1; index++) {
    const current = sorted[index];
    const next = sorted[index + 1];
    if (current.transition === 'End' || current.minute >= next.minute) continue;
    intervals.push({
      id: `${day}-${current.id}`, day, start: current.minute, end: next.minute,
      activity: current.transition, project, order: current.order,
      evidence: [current, next], confirmed: current.transition !== 'Gap',
    });
  }
  return intervals;
}

export function makeWeek() {
  return days.flatMap((_, day) => {
    if (day === 0) return reconstruct(monday, day, projects[0]);
    const project = projects[day === 2 || day === 4 ? 1 : 0];
    const order = project === projects[0] ? 'WO-4821' : 'WO-4917';
    const transitions: [number, Signal['transition'], string, string][] = [
      [480, 'Travel', 'Travel started', 'Technician check-in'],
      [510, 'Work', 'Work started', 'IFS work-order status'],
      [720, 'Break', 'Break started', 'Worker-reported break'],
      [750, 'Work', 'Work resumed', 'Technician check-in'],
      [day === 4 ? 930 : 975, 'Travel', 'Work completed · return travel started', 'IFS work-order status + check-in'],
      [day === 4 ? 960 : 1005, 'End', 'Return travel ended', 'Technician check-in'],
    ];
    return reconstruct(transitions.map(([minute, transition, label, source], i) => ({
      id: `e${i + 1}`, minute, label, transition, source, order, quality: 'Direct',
    })), day, project);
  });
}

export function minutes(value: string) {
  if (!/^\d\d:\d\d$/.test(value)) return NaN;
  const [hour, minute] = value.split(':').map(Number);
  return hour < 24 && minute < 60 ? hour * 60 + minute : NaN;
}

export function clock(minute: number) {
  if (!Number.isFinite(minute)) return '';
  const normalized = minute % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function duration(minute: number) {
  return `${Math.floor(minute / 60)}h ${String(minute % 60).padStart(2, '0')}m`;
}

export function sumMinutes(intervals: Interval[]) {
  return intervals.reduce((sum, row) => sum + Math.max(0, (row.end - row.start) || 0), 0);
}

export function validate(intervals: Interval[]) {
  const errors = new Set<string>();
  for (const row of intervals) {
    if (!row.confirmed || row.activity === 'Gap') errors.add('Classify and confirm the unresolved Monday interval.');
    if (!Number.isFinite(row.start) || !Number.isFinite(row.end) || row.end <= row.start) {
      errors.add('Every interval needs a valid start and a later end.');
    }
  }
  for (const [day, label] of days.entries()) {
    const rows = intervals.filter(row => row.day === day).sort((a, b) => a.start - b.start);
    if (rows.some((row, index) => index > 0 && row.start < rows[index - 1].end)) {
      errors.add(`${label} contains overlapping intervals.`);
    }
  }
  return [...errors];
}
