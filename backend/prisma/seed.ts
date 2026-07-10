/**
 * HabitLoop — Database Seed Script (Minimal)
 *
 * Seeds:
 *   - 2 minimal users (Manish, Veena) to show the app works without clutter
 *   - 1 habit per user
 *   - 2 recent check-ins
 *   - 1 pending friendship
 */

import { PrismaClient, ActivityType, FriendshipStatus, HabitFrequency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const hash = (plain: string): Promise<string> => bcrypt.hash(plain, 10);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main(): Promise<void> {
  console.info('🌱 Seeding minimal HabitLoop database…\n');

  // 2. Users
  console.info('👤 Creating users…');
  const [manish, veena] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'manish@habitloop.dev' },
      update: {},
      create: {
        username: 'manish',
        email: 'manish@habitloop.dev',
        passwordHash: await hash('Password1!'),
        avatarUrl: 'https://api.dicebear.com/8.x/notionists/svg?seed=Manish&backgroundColor=b6e3f4',
        timezone: 'Asia/Kolkata',
      },
    }),
    prisma.user.upsert({
      where: { email: 'veena@habitloop.dev' },
      update: {},
      create: {
        username: 'veena',
        email: 'veena@habitloop.dev',
        passwordHash: await hash('Password1!'),
        avatarUrl: 'https://api.dicebear.com/8.x/notionists/svg?seed=Veena&backgroundColor=c0aede',
        timezone: 'Asia/Kolkata',
      },
    }),
  ]);

  // 3. Habits
  console.info('📋 Creating habits…');
  
  const manishHabit = await prisma.habit.upsert({
    where: { id: 'seed-manish-habit-1' },
    update: {},
    create: {
      userId: manish.id,
      title: 'Read 20 pages',
      description: 'Before bed',
      frequency: HabitFrequency.DAILY,
      color: '#4D96FF',
      icon: '📚',
    },
  }).catch(() => prisma.habit.create({
    data: { userId: manish.id, title: 'Read 20 pages', frequency: HabitFrequency.DAILY, color: '#4D96FF', icon: '📚' }
  }));

  const veenaHabit = await prisma.habit.upsert({
    where: { id: 'seed-veena-habit-1' },
    update: {},
    create: {
      userId: veena.id,
      title: 'Morning Walk',
      description: '15 mins outside',
      frequency: HabitFrequency.DAILY,
      color: '#F4D160',
      icon: '🚶‍♀️',
    },
  }).catch(() => prisma.habit.create({
    data: { userId: veena.id, title: 'Morning Walk', frequency: HabitFrequency.DAILY, color: '#F4D160', icon: '🚶‍♀️' }
  }));

  // 4. Check-ins & Streaks
  console.info('✅ Creating check-ins & streaks…');

  await prisma.habitCheckIn.upsert({
    where: { habitId_completedDate: { habitId: manishHabit.id, completedDate: daysAgo(1) } },
    update: {},
    create: { habitId: manishHabit.id, userId: manish.id, completedDate: daysAgo(1), note: 'Good book!' },
  });
  
  await prisma.streak.upsert({
    where: { habitId: manishHabit.id },
    update: { currentStreak: 1, longestStreak: 1, lastCheckIn: daysAgo(1) },
    create: { habitId: manishHabit.id, userId: manish.id, currentStreak: 1, longestStreak: 1, lastCheckIn: daysAgo(1) },
  });

  // 5. Friendships
  console.info('🤝 Creating friendships…');
  await prisma.friendship.upsert({
    where: { requesterId_receiverId: { requesterId: manish.id, receiverId: veena.id } },
    update: {},
    create: { requesterId: manish.id, receiverId: veena.id, status: FriendshipStatus.PENDING },
  });

  // 6. Minimal Feed Activity
  console.info('📜 Creating activity log…');
  await prisma.activity.createMany({
    data: [
      { userId: manish.id, habitId: manishHabit.id, activityType: ActivityType.HABIT_CREATED, metadata: { title: 'Read 20 pages' }, createdAt: daysAgo(2) },
      { userId: manish.id, habitId: manishHabit.id, activityType: ActivityType.HABIT_CHECKED_IN, metadata: { streakCount: 1 }, createdAt: daysAgo(1) },
      { userId: veena.id, habitId: veenaHabit.id, activityType: ActivityType.HABIT_CREATED, metadata: { title: 'Morning Walk' }, createdAt: daysAgo(1) },
    ],
    skipDuplicates: true,
  });

  console.info('\n✨ Minimal Seed complete!\n');
  console.info('🔑 Test credentials (password: Password1!)');
  console.info('   manish@habitloop.dev');
  console.info('   veena@habitloop.dev');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
