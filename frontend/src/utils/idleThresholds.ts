// Students are far more likely to be on shared school-lab computers, and their
// whole session starts from a one-time token anyway — short idle window.
// Admins/staff are more likely on personal devices and doing longer work sessions.
export const STUDENT_IDLE_MS = 5 * 60 * 1000; // 5 minutes
export const STUDENT_WARNING_MS = 60 * 1000; // 60 second countdown
export const STAFF_IDLE_MS = 30 * 60 * 1000; // 30 minutes
export const STAFF_WARNING_MS = 120 * 1000; // 120 second countdown

export const idleThresholdFor = (role: string | undefined) =>
  role === 'STUDENT' ? STUDENT_IDLE_MS : STAFF_IDLE_MS;
