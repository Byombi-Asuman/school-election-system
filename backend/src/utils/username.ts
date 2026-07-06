import prisma from './prisma';

/**
 * Builds a base username in the form firstnameLastname@lvk
 * e.g. "James" "Wilson" -> "jamesWilson@lvk"
 */
const buildBaseUsername = (firstName: string, lastName: string): string => {
  const clean = (s: string) => s.trim().replace(/[^a-zA-Z]/g, '');
  const first = clean(firstName).toLowerCase();
  const last = clean(lastName).toLowerCase();
  return `${first}${last}@lvk`;
};

/**
 * Generates a unique username for a student, appending an incrementing
 * number before the @lvk suffix if the base username is already taken.
 * e.g. jamesWilson@lvk, jamesWilson2@lvk, jamesWilson3@lvk ...
 */
export const generateUniqueUsername = async (firstName: string, lastName: string): Promise<string> => {
  const base = buildBaseUsername(firstName, lastName);
  const [localPart, domain] = base.split('@');

  let candidate = base;
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.student.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${localPart}${suffix}@${domain}`;
  }
};
