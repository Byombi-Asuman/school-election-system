import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/audit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { generateUniqueUsername } from '../utils/username';

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { search, class: cls, house, isEligible, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      ...(cls && { class: cls as string }),
      ...(house && { house: house as string }),
      ...(isEligible !== undefined && { isEligible: isEligible === 'true' }),
      ...(search && {
        OR: [
          { admissionNumber: { contains: search as string, mode: 'insensitive' } },
          { username: { contains: search as string, mode: 'insensitive' } },
          { user: { firstName: { contains: search as string, mode: 'insensitive' } } },
          { user: { lastName: { contains: search as string, mode: 'insensitive' } } },
          { user: { email: { contains: search as string, mode: 'insensitive' } } },
        ],
      }),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true, lastLoginAt: true } },
        },
        orderBy: { admissionNumber: 'asc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.student.count({ where }),
    ]);

    res.json({ students, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

export const getStudent = async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } },
        votes: { include: { election: { select: { title: true } }, position: { select: { title: true } } } },
        candidacies: { include: { election: { select: { title: true } }, position: { select: { title: true } } } },
      },
    });

    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, lastName, admissionNumber, class: cls, stream, house, year } = req.body;

    const username = await generateUniqueUsername(firstName, lastName);
    // Students authenticate via username + admin-issued OTP, not a static password.
    // A random, unguessable password is still stored to satisfy the schema and as a fallback lockout value.
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hashed = await bcrypt.hash(randomPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashed,
        firstName,
        lastName,
        role: 'STUDENT',
        student: {
          create: {
            admissionNumber,
            username,
            class: cls,
            stream,
            house,
            year: parseInt(year),
          },
        },
      },
      include: { student: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entity: 'Student',
      entityId: user.student!.id,
      details: { admissionNumber, email, username },
      req,
    });

    res.status(201).json({
      message: 'Student registered',
      user: { ...user, password: undefined },
      username,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email, admission number, or username already exists' });
    }
    res.status(500).json({ error: 'Failed to create student' });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, class: cls, stream, house, year, isEligible, isActive } = req.body;

    const student = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: student.userId },
        data: {
          ...(firstName && { firstName }),
          ...(lastName && { lastName }),
          ...(isActive !== undefined && { isActive }),
        },
      }),
      prisma.student.update({
        where: { id },
        data: {
          ...(cls && { class: cls }),
          ...(stream !== undefined && { stream }),
          ...(house !== undefined && { house }),
          ...(year && { year: parseInt(year) }),
          ...(isEligible !== undefined && { isEligible }),
        },
      }),
    ]);

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Student',
      entityId: id,
      details: req.body,
      req,
    });

    res.json({ message: 'Student updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student' });
  }
};

export const toggleEligibility = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const updated = await prisma.student.update({
      where: { id },
      data: { isEligible: !student.isEligible },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Student',
      entityId: id,
      details: { isEligible: updated.isEligible },
      req,
    });

    res.json({ isEligible: updated.isEligible });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle eligibility' });
  }
};

// Soft-delete / reactivate — the default, safe way to "remove" a student.
// Deactivated students are hidden from normal lists and can't be issued a
// login token, but their account and any votes they've already cast are
// fully preserved, unlike a hard delete.
export const toggleActive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const updated = await prisma.user.update({
      where: { id: student.userId },
      data: { isActive: !student.user.isActive },
      select: { isActive: true },
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entity: 'Student',
      entityId: id,
      details: { action: updated.isActive ? 'reactivated' : 'deactivated' },
      req,
    });

    res.json({ isActive: updated.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update student status' });
  }
};

export const importStudents = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = req.file.originalname.split('.').pop()?.toLowerCase();
    const students: any[] = [];

    if (ext === 'csv') {
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(req.file!.path)
          .pipe(csv())
          .on('data', (row) => students.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
    } else {
      const workbook = XLSX.readFile(req.file.path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      students.push(...data);
    }

    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const [index, row] of students.entries()) {
      const rowNum = index + 2; // +2: 1-indexed, plus header row
      try {
        const email = (row.email || row.Email || '').toLowerCase().trim();
        const admissionNumber = (row.admissionNumber || row.admission_number || row['Admission Number'] || '').trim();
        const firstName = (row.firstName || row.first_name || row['First Name'] || '').trim();
        const lastName = (row.lastName || row.last_name || row['Last Name'] || '').trim();
        const cls = (row.class || row.Class || '').trim();

        if (!email || !admissionNumber || !firstName || !lastName) {
          const missing = [!email && 'email', !admissionNumber && 'admissionNumber', !firstName && 'firstName', !lastName && 'lastName']
            .filter(Boolean).join(', ');
          results.errors.push(`Row ${rowNum} skipped: missing required field(s) — ${missing}`);
          results.skipped++;
          continue;
        }

        const username = await generateUniqueUsername(firstName, lastName);
        const randomPassword = crypto.randomBytes(24).toString('hex');
        const hashed = await bcrypt.hash(randomPassword, 12);

        await prisma.user.create({
          data: {
            email,
            password: hashed,
            firstName,
            lastName,
            role: 'STUDENT',
            student: {
              create: {
                admissionNumber,
                username,
                class: cls || 'Unknown',
                stream: (row.stream || row.Stream || '').trim() || null,
                house: (row.house || row.House || '').trim() || null,
                year: parseInt(row.year || row.Year || new Date().getFullYear().toString()),
              },
            },
          },
        });

        results.created++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          const field = err.meta?.target?.[0] || 'field';
          const email = (row.email || row.Email || '').trim();
          const admissionNumber = (row.admissionNumber || row.admission_number || row['Admission Number'] || '').trim();
          const identifier = field === 'email' ? email : field === 'admissionNumber' ? admissionNumber : email || admissionNumber;
          results.errors.push(`Row ${rowNum} skipped: ${field} '${identifier}' already exists`);
          results.skipped++;
        } else {
          results.errors.push(`Row ${rowNum} skipped: ${err.message}`);
          results.skipped++;
        }
      }
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    await createAuditLog({
      userId: req.user!.id,
      action: 'IMPORT',
      entity: 'Student',
      details: results,
      req,
    });

    res.json({ message: 'Import completed', ...results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import students' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    // Vote rows cascade-delete with their voter, so a hard delete would
    // silently remove already-cast votes from every election's results —
    // changing outcomes after the fact with no visible trace beyond an audit
    // log entry. Block it outright once a student has voted; deactivating
    // (soft-delete) is always safe and available regardless.
    const voteCount = await prisma.vote.count({ where: { voterId: id } });
    if (voteCount > 0) {
      return res.status(400).json({
        error: `This student has cast ${voteCount} vote${voteCount > 1 ? 's' : ''}. Deleting them would remove those votes from election results. Deactivate the account instead to preserve vote integrity.`,
      });
    }

    await prisma.user.delete({ where: { id: student.userId } });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entity: 'Student',
      entityId: id,
      details: { admissionNumber: student.admissionNumber },
      req,
    });

    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete student' });
  }
};