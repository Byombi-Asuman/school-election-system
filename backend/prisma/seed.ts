import { PrismaClient, Role, ElectionStatus, CandidateStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create school profile
  await prisma.school.upsert({
    where: { id: 'school-001' },
    update: {},
    create: {
      id: 'school-001',
      name: 'Greenfield Academy',
      address: '123 Education Lane, Learning City',
      phone: '+1-555-0100',
      email: 'admin@greenfieldacademy.edu',
      website: 'https://greenfieldacademy.edu',
      motto: 'Excellence Through Knowledge',
      rules: 'All students must vote responsibly. Each student gets one vote per position. Results are final once declared.',
    },
  });

  // Hash password
  const hashedPassword = await bcrypt.hash('Admin@123', 12);
  const studentPassword = await bcrypt.hash('Student@123', 12); // vestigial - students log in via username + OTP, not this

  // Builds a username in the form firstnameLastname@lvk, matching backend/src/utils/username.ts
  const buildUsername = (firstName: string, lastName: string) => {
    const clean = (s: string) => s.replace(/[^a-zA-Z]/g, '');
    const first = clean(firstName).toLowerCase();
    const last = clean(lastName);
    const lastCapitalized = last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
    return `${first}${lastCapitalized}@lvk`;
  };

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@school.edu' },
    update: {},
    create: {
      email: 'superadmin@school.edu',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
    },
  });

  // Create Election Admin
  const electionAdmin = await prisma.user.upsert({
    where: { email: 'electionadmin@school.edu' },
    update: {},
    create: {
      email: 'electionadmin@school.edu',
      password: hashedPassword,
      firstName: 'Election',
      lastName: 'Administrator',
      role: Role.ELECTION_ADMIN,
    },
  });

  // Create student users
  const students = [
    { email: 'james.wilson@school.edu', firstName: 'James', lastName: 'Wilson', admission: 'ADM2024001', class: 'Form 5', stream: 'Science', house: 'Eagle' },
    { email: 'sarah.johnson@school.edu', firstName: 'Sarah', lastName: 'Johnson', admission: 'ADM2024002', class: 'Form 5', stream: 'Arts', house: 'Lion' },
    { email: 'michael.brown@school.edu', firstName: 'Michael', lastName: 'Brown', admission: 'ADM2024003', class: 'Form 4', stream: 'Science', house: 'Eagle' },
    { email: 'emily.davis@school.edu', firstName: 'Emily', lastName: 'Davis', admission: 'ADM2024004', class: 'Form 4', stream: 'Commerce', house: 'Phoenix' },
    { email: 'david.martinez@school.edu', firstName: 'David', lastName: 'Martinez', admission: 'ADM2024005', class: 'Form 5', stream: 'Science', house: 'Lion' },
    { email: 'jessica.taylor@school.edu', firstName: 'Jessica', lastName: 'Taylor', admission: 'ADM2024006', class: 'Form 3', stream: 'Arts', house: 'Phoenix' },
    { email: 'christopher.anderson@school.edu', firstName: 'Christopher', lastName: 'Anderson', admission: 'ADM2024007', class: 'Form 5', stream: 'Commerce', house: 'Eagle' },
    { email: 'ashley.thomas@school.edu', firstName: 'Ashley', lastName: 'Thomas', admission: 'ADM2024008', class: 'Form 4', stream: 'Science', house: 'Lion' },
    { email: 'matthew.jackson@school.edu', firstName: 'Matthew', lastName: 'Jackson', admission: 'ADM2024009', class: 'Form 3', stream: 'Arts', house: 'Phoenix' },
    { email: 'amanda.white@school.edu', firstName: 'Amanda', lastName: 'White', admission: 'ADM2024010', class: 'Form 5', stream: 'Science', house: 'Eagle' },
  ];

  const createdStudents = [];
  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: studentPassword,
        firstName: s.firstName,
        lastName: s.lastName,
        role: Role.STUDENT,
      },
    });

    const username = buildUsername(s.firstName, s.lastName);

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: { username },
      create: {
        userId: user.id,
        admissionNumber: s.admission,
        username,
        class: s.class,
        stream: s.stream,
        house: s.house,
        year: 2024,
        isEligible: true,
      },
    });
    createdStudents.push({ user, student });
  }

  // Create Election
  const election = await prisma.election.create({
    data: {
      title: 'Student Government Elections 2024',
      description: 'Annual student government elections for the academic year 2024/2025. All eligible students are encouraged to participate in this democratic process.',
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),   // 5 days from now
      status: ElectionStatus.OPEN,
      liveResults: false,
      createdById: superAdmin.id,
      adminId: electionAdmin.id,
    },
  });

  // Create Positions
  const positions = await Promise.all([
    prisma.position.create({
      data: {
        electionId: election.id,
        title: 'Head Prefect',
        description: 'Overall student body leader, representing all students',
        maxWinners: 1,
        order: 1,
      },
    }),
    prisma.position.create({
      data: {
        electionId: election.id,
        title: 'Deputy Head Prefect',
        description: 'Assists the Head Prefect in all duties',
        maxWinners: 1,
        order: 2,
      },
    }),
    prisma.position.create({
      data: {
        electionId: election.id,
        title: 'Sports Captain',
        description: 'Leads all sports and recreational activities',
        maxWinners: 1,
        order: 3,
      },
    }),
    prisma.position.create({
      data: {
        electionId: election.id,
        title: 'Cultural Prefect',
        description: 'Oversees cultural events and activities',
        maxWinners: 1,
        order: 4,
      },
    }),
  ]);

  // Create Candidates
  const candidateData = [
    { studentIdx: 0, positionIdx: 0, manifesto: 'I will work tirelessly to improve student welfare, enhance academic resources, and create a more inclusive school environment where every student feels valued and heard.' },
    { studentIdx: 4, positionIdx: 0, manifesto: 'My vision is a school where innovation meets tradition. I will bridge the gap between students and administration, creating transparent communication channels.' },
    { studentIdx: 1, positionIdx: 1, manifesto: 'As Deputy Head Prefect, I commit to supporting the head prefect and ensuring student concerns are addressed promptly and fairly.' },
    { studentIdx: 3, positionIdx: 1, manifesto: 'I believe in collaborative leadership. I will work closely with all student representatives to deliver meaningful change in our school.' },
    { studentIdx: 2, positionIdx: 2, manifesto: 'My goal is to transform our sports program, promote fitness for all, and lead our school to victory in inter-school competitions.' },
    { studentIdx: 6, positionIdx: 2, manifesto: 'Sports unite us. I will create opportunities for every student to participate in physical activities, regardless of skill level.' },
    { studentIdx: 5, positionIdx: 3, manifesto: 'I will celebrate our diverse cultural heritage through events, festivals, and programs that bring our school community together.' },
    { studentIdx: 7, positionIdx: 3, manifesto: 'Culture is our identity. I will ensure every student has a platform to express their cultural background and talents.' },
  ];

  for (const cd of candidateData) {
    await prisma.candidate.create({
      data: {
        electionId: election.id,
        positionId: positions[cd.positionIdx].id,
        studentId: createdStudents[cd.studentIdx].student.id,
        manifesto: cd.manifesto,
        status: CandidateStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: electionAdmin.id,
      },
    });
  }

  // Create some votes
  const candidates = await prisma.candidate.findMany({
    where: { electionId: election.id, status: CandidateStatus.APPROVED },
    include: { position: true },
  });

  // Simulate some votes (students 2-9 vote)
  for (let i = 2; i < createdStudents.length; i++) {
    const voter = createdStudents[i];
    for (const position of positions) {
      const positionCandidates = candidates.filter(c => c.positionId === position.id);
      if (positionCandidates.length > 0) {
        const randomCandidate = positionCandidates[Math.floor(Math.random() * positionCandidates.length)];
        try {
          await prisma.vote.create({
            data: {
              electionId: election.id,
              positionId: position.id,
              candidateId: randomCandidate.id,
              voterId: voter.student.id,
              ipAddress: '127.0.0.1',
            },
          });
        } catch {
          // Skip duplicate votes
        }
      }
    }
  }

  // Create Announcements
  await prisma.announcement.createMany({
    data: [
      {
        electionId: election.id,
        title: 'Elections Now Open!',
        content: 'The Student Government Elections 2024 are now officially open. All eligible students can cast their votes until the end date. Make your voice heard!',
        isActive: true,
      },
      {
        title: 'Voting Guidelines Reminder',
        content: 'Remember: Each student gets one vote per position. Your vote is secret and secure. Think carefully before submitting.',
        isActive: true,
      },
    ],
  });

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: 'CREATE',
        entity: 'Election',
        entityId: election.id,
        details: { title: election.title },
        ipAddress: '127.0.0.1',
      },
      {
        userId: electionAdmin.id,
        action: 'LOGIN',
        details: { email: electionAdmin.email },
        ipAddress: '127.0.0.1',
      },
    ],
  });

  console.log('✅ Seeding completed!');
  console.log('\n📋 Staff Login Credentials (email + password):');
  console.log('Super Admin:     superadmin@school.edu / Admin@123');
  console.log('Election Admin:  electionadmin@school.edu / Admin@123');
  console.log('\n👤 Student Login (username + admin-issued OTP — no static password):');
  students.forEach((s) => console.log(`${s.firstName} ${s.lastName}:  ${buildUsername(s.firstName, s.lastName)}`));
  console.log('\nGenerate a 15-minute OTP for any student from Admin → Voter OTP before they can log in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
