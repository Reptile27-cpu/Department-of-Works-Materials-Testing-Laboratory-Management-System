import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

const requiredSeedEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured before seeding`);
  return value;
};

async function main() {
  console.log('🌱 Seeding database...');

  const superAdminEmail = process.env.SYSTEM_ADMIN_EMAIL || 'admin@png-sms.com';
  const superAdminPasswordValue = requiredSeedEnv('SYSTEM_ADMIN_PASSWORD');
  const schoolAdminPasswordValue = requiredSeedEnv('SCHOOL_ADMIN_PASSWORD');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeRecord.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.reportCard.deleteMany();
  await prisma.gradeBoundary.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.studentClass.deleteMany();
  await prisma.class.deleteMany();
  await prisma.studentParent.deleteMany();
  await prisma.parent.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  console.log('🧹 Cleaned existing data');

  // ==================== Seed Roles ====================
  const rolesData = [
    { name: 'super_admin', description: 'Platform-wide super administrator', isSystem: true },
    { name: 'school_admin', description: 'School-level administrator', isSystem: true },
    { name: 'teacher', description: 'Classroom teacher', isSystem: true },
    { name: 'parent', description: 'Student parent or guardian', isSystem: true },
    { name: 'student', description: 'Enrolled student', isSystem: true },
  ];

  for (const role of rolesData) {
    await prisma.role.create({
      data: { id: uuidv4(), ...role },
    });
  }

  console.log('✅ Roles seeded');

  // ==================== Seed Super Admin ====================
  const superAdminPassword = await bcrypt.hash(
    superAdminPasswordValue,
    12
  );

  await prisma.user.create({
    data: {
      id: uuidv4(),
      email: superAdminEmail,
      passwordHash: superAdminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      emailVerified: true,
    },
  });

  console.log(`✅ Super admin seeded (${superAdminEmail})`);

  // ==================== Seed Demo School ====================
  const schoolId = uuidv4();
  const schoolCode = 'PNG-POM-001';

  await prisma.school.create({
    data: {
      id: schoolId,
      name: 'Port Moresby Demonstration School',
      code: schoolCode,
      address: '123 Education Drive, Waigani',
      province: 'National Capital District',
      district: 'Port Moresby',
      phone: '+675 320 1234',
      email: 'info@pomdemo.edu.pg',
      schoolType: 'combined',
      subscriptionTier: 'pro',
    },
  });

  console.log(`✅ Demo school seeded: Port Moresby Demonstration School (${schoolCode})`);

  // ==================== Seed School Admin ====================
  const schoolAdminPassword = await bcrypt.hash(schoolAdminPasswordValue, 12);
  const schoolAdminId = uuidv4();

  await prisma.user.create({
    data: {
      id: schoolAdminId,
      schoolId: schoolId,
      email: 'principal@pomdemo.edu.pg',
      passwordHash: schoolAdminPassword,
      firstName: 'John',
      lastName: 'Principal',
      role: 'school_admin',
      emailVerified: true,
    },
  });

  console.log('✅ School admin seeded (principal@pomdemo.edu.pg / School123!)');

  // ==================== Seed Academic Year and Terms ====================
  const academicYearId = uuidv4();
  await prisma.academicYear.create({
    data: {
      id: academicYearId,
      schoolId,
      name: '2024 Academic Year',
      startDate: new Date('2024-01-29'),
      endDate: new Date('2024-12-13'),
      isCurrent: true,
    },
  });

  const term1Id = uuidv4();
  const term2Id = uuidv4();
  const term3Id = uuidv4();

  await prisma.term.createMany({
    data: [
      { id: term1Id, schoolId, academicYearId, name: 'Term 1', startDate: new Date('2024-01-29'), endDate: new Date('2024-04-26'), isCurrent: true },
      { id: term2Id, schoolId, academicYearId, name: 'Term 2', startDate: new Date('2024-05-06'), endDate: new Date('2024-08-16'), isCurrent: false },
      { id: term3Id, schoolId, academicYearId, name: 'Term 3', startDate: new Date('2024-09-02'), endDate: new Date('2024-12-13'), isCurrent: false },
    ],
  });

  console.log('✅ Academic year and terms seeded');

  // ==================== Seed Subjects ====================
  const subjectIds: Record<string, string> = {};
  const subjects = [
    { key: 'eng', name: 'English', code: 'ENG', category: 'core', creditHours: 5 },
    { key: 'math', name: 'Mathematics', code: 'MATH', category: 'core', creditHours: 5 },
    { key: 'science', name: 'Science', code: 'SCI', category: 'core', creditHours: 4 },
    { key: 'social', name: 'Social Science', code: 'SOC', category: 'core', creditHours: 3 },
    { key: 'pe', name: 'Physical Education', code: 'PE', category: 'compulsory', creditHours: 2 },
  ];

  for (const subj of subjects) {
    const id = uuidv4();
    subjectIds[subj.key] = id;
    const { key, ...subjectData } = subj;

await prisma.subject.create({
  data: {
    id,
    schoolId,
    ...subjectData,
  },
});
  }

  console.log('✅ Subjects seeded');

  // ==================== Seed Classes ====================
  const classIds: string[] = [];
  for (let grade = 9; grade <= 10; grade++) {
    for (const section of ['A', 'B']) {
      const classId = uuidv4();
      classIds.push(classId);
      await prisma.class.create({
        data: {
          id: classId,
          schoolId,
          name: `Grade ${grade}${section}`,
          grade: `Grade ${grade}`,
          section,
          academicYearId,
          capacity: 40,
          roomNumber: `${grade}0${section === 'A' ? '1' : '2'}`,
        },
      });
    }
  }

  console.log('✅ Classes seeded');

  // ==================== Seed Students ====================
  const studentIds: string[] = [];
  const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  const lastNames = ['Kumar', 'Smith', 'Namo', 'Brown', 'Wilson', 'Davis', 'Miller', 'Garcia', 'Martinez', 'Anderson'];

  for (let i = 1; i <= 20; i++) {
    const studentId = uuidv4();
    studentIds.push(studentId);
    const studentCode = `PNG-POM-001-2024-${String(i).padStart(4, '0')}`;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];

    await prisma.student.create({
      data: {
        id: studentId,
        schoolId,
        studentId: studentCode,
        firstName,
        lastName,
        dateOfBirth: new Date(`2008-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`),
        gender: i % 2 === 0 ? 'male' : 'female',
        enrollmentDate: new Date('2024-01-29'),
        status: 'active',
        academicYearId,
        address: `${i} Main Street, Port Moresby`,
        province: 'National Capital District',
        phone: `+675 7${String(i).padStart(7, '0')}`,
      },
    });
  }

  console.log('✅ Students seeded');

  // ==================== Seed Teachers ====================
  const teacherIds: string[] = [];
  const teacherNames = [
    { first: 'Sarah', last: 'Teaching', email: 'sarah.teaching@pomdemo.edu.pg' },
    { first: 'Michael', last: 'Educator', email: 'michael.educator@pomdemo.edu.pg' },
    { first: 'Rachel', last: 'Instructor', email: 'rachel.instructor@pomdemo.edu.pg' },
  ];

  for (let i = 0; i < teacherNames.length; i++) {
    const teacherId = uuidv4();
    teacherIds.push(teacherId);
    const t = teacherNames[i];
    const teacherPassword = await bcrypt.hash('Teacher123!', 12);

    const userId = uuidv4();
    await prisma.user.create({
      data: {
        id: userId,
        schoolId,
        email: t.email,
        passwordHash: teacherPassword,
        firstName: t.first,
        lastName: t.last,
        role: 'teacher',
        emailVerified: true,
      },
    });

    await prisma.teacher.create({
      data: {
        id: teacherId,
        schoolId,
        userId,
        employeeId: `TCH-${String(i + 1).padStart(4, '0')}`,
        firstName: t.first,
        lastName: t.last,
        qualification: 'Bachelor of Education',
        dateHired: new Date('2023-01-15'),
        status: 'active',
      },
    });
  }

  console.log('✅ Teachers seeded');

  // ==================== Seed Attendance Records ====================
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 30);

  for (let i = 0; i < studentIds.length; i++) {
    for (let d = 0; d < 30; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + d);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // 85% present, 10% absent, 5% late
      const rand = Math.random();
      let status: string;
      if (rand < 0.85) status = 'present';
      else if (rand < 0.95) status = 'absent';
      else status = 'late';

      await prisma.attendance.create({
        data: {
          id: uuidv4(),
          schoolId,
          studentId: studentIds[i],
          date,
          status,
          lateMinutes: status === 'late' ? Math.floor(Math.random() * 30) + 5 : 0,
        },
      });
    }
  }

  console.log('✅ Attendance records seeded (30 days)');

  // ==================== Seed Grade Boundaries ====================
  const gradeBoundaries = [
    { grade: 'A+', gradePoint: 4.0, minPercentage: 90, maxPercentage: 100 },
    { grade: 'A', gradePoint: 3.7, minPercentage: 85, maxPercentage: 89 },
    { grade: 'A-', gradePoint: 3.3, minPercentage: 80, maxPercentage: 84 },
    { grade: 'B+', gradePoint: 3.0, minPercentage: 75, maxPercentage: 79 },
    { grade: 'B', gradePoint: 2.7, minPercentage: 70, maxPercentage: 74 },
    { grade: 'B-', gradePoint: 2.3, minPercentage: 65, maxPercentage: 69 },
    { grade: 'C+', gradePoint: 2.0, minPercentage: 60, maxPercentage: 64 },
    { grade: 'C', gradePoint: 1.7, minPercentage: 55, maxPercentage: 59 },
    { grade: 'C-', gradePoint: 1.3, minPercentage: 50, maxPercentage: 54 },
    { grade: 'D', gradePoint: 1.0, minPercentage: 40, maxPercentage: 49 },
    { grade: 'F', gradePoint: 0.0, minPercentage: 0, maxPercentage: 39 },
  ];

  for (const gb of gradeBoundaries) {
    await prisma.gradeBoundary.create({
      data: { id: uuidv4(), schoolId, ...gb },
    });
  }

  console.log('✅ Grade boundaries seeded');

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('📧 Login Credentials:');
  console.log('   Super Admin: admin@png-sms.com / Admin123!');
  console.log('   School Admin: principal@pomdemo.edu.pg / School123!');
  console.log('   Teacher: sarah.teaching@pomdemo.edu.pg / Teacher123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

