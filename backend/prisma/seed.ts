/**
 * HabitLoop — Database Seed Script
 *
 * Run:  npx prisma db seed
 *       (or)  npx ts-node prisma/seed.ts
 *
 * Seeds:
 *   - 3 users (alice, bob, carol)
 *   - 3 habits per user
 *   - Check-ins for the past 14 days
 *   - Streak records
 *   - Friendship between alice & bob (accepted), bob & carol (pending)
 *   - Activity log entries
 *   - Notifications
 */

import { PrismaClient, ActivityType, FriendshipStatus, HabitFrequency } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hash = (plain: string): Promise<string> => bcrypt.hash(plain, 10);

/** Returns a Date at midnight UTC for `daysAgo` days before today */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.info('🌱 Seeding HabitLoop database…\n');

  // ── 1. Users ─────────────────────────────────────────────────────────────
  console.info('👤 Creating users…');

  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@habitloop.dev' },
      update: {},
      create: {
        username: 'alice',
        email: 'alice@habitloop.dev',
        passwordHash: await hash('Password1!'),
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=alice',
        timezone: 'America/New_York',
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@habitloop.dev' },
      update: {},
      create: {
        username: 'bob',
        email: 'bob@habitloop.dev',
        passwordHash: await hash('Password1!'),
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=bob',
        timezone: 'America/Los_Angeles',
      },
    }),
    prisma.user.upsert({
      where: { email: 'carol@habitloop.dev' },
      update: {},
      create: {
        username: 'carol',
        email: 'carol@habitloop.dev',
        passwordHash: await hash('Password1!'),
        avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=carol',
        timezone: 'Europe/London',
      },
    }),
  ]);

  console.info(`   ✓ alice (${alice.id})`);
  console.info(`   ✓ bob   (${bob.id})`);
  console.info(`   ✓ carol (${carol.id})`);

  // ── 2. Habits ─────────────────────────────────────────────────────────────
  console.info('\n📋 Creating habits…');

  const habitDefs = [
    // Alice
    { userId: alice.id, title: 'Morning meditation',  description: '10 minutes of mindfulness after waking up', frequency: HabitFrequency.DAILY,  color: '#D4FF4F', icon: '🧘', checkInDays: 14 },
    { userId: alice.id, title: 'Read 30 minutes',     description: 'Non-fiction books only',                    frequency: HabitFrequency.DAILY,  color: '#6C5CE7', icon: '📖', checkInDays: 10 },
    { userId: alice.id, title: 'Evening run',          description: '5km minimum',                               frequency: HabitFrequency.WEEKLY, color: '#74C0FC', icon: '🏃', checkInDays: 5  },
    // Bob
    { userId: bob.id,   title: 'Cold shower',          description: 'Start the day strong',                      frequency: HabitFrequency.DAILY,  color: '#D4FF4F', icon: '🚿', checkInDays: 7  },
    { userId: bob.id,   title: 'No social media',      description: 'Before 12pm',                               frequency: HabitFrequency.DAILY,  color: '#6C5CE7', icon: '📵', checkInDays: 3  },
    { userId: bob.id,   title: 'Workout',               description: 'Gym or home workout',                       frequency: HabitFrequency.DAILY,  color: '#74C0FC', icon: '💪', checkInDays: 12 },
    // Carol
    { userId: carol.id, title: 'Journaling',            description: '5 things I am grateful for',               frequency: HabitFrequency.DAILY,  color: '#D4FF4F', icon: '✍️', checkInDays: 14 },
    { userId: carol.id, title: 'Learn Spanish',         description: 'Duolingo streak',                           frequency: HabitFrequency.DAILY,  color: '#6C5CE7', icon: '🇪🇸', checkInDays: 9  },
    { userId: carol.id, title: 'Drink 2L water',        description: 'Track with app',                            frequency: HabitFrequency.DAILY,  color: '#74C0FC', icon: '💧', checkInDays: 6  },
  ];

  const habits = await Promise.all(
    habitDefs.map((def) =>
      prisma.habit.upsert({
        where: {
          // No natural unique key on habit — use find-or-create pattern
          id: 'seed-placeholder',
        },
        update: {},
        create: {
          userId:      def.userId,
          title:       def.title,
          description: def.description,
          frequency:   def.frequency,
          color:       def.color,
          icon:        def.icon,
        },
      }).catch(() =>
        // upsert by id doesn't work with seed-placeholder — just create
        prisma.habit.create({
          data: {
            userId:      def.userId,
            title:       def.title,
            description: def.description,
            frequency:   def.frequency,
            color:       def.color,
            icon:        def.icon,
          },
        }),
      ),
    ),
  );

  console.info(`   ✓ ${habits.length} habits created`);

  // ── 3. Check-ins ──────────────────────────────────────────────────────────
  console.info('\n✅ Creating check-ins…');

  let totalCheckIns = 0;

  for (let i = 0; i < habits.length; i++) {
    const habit = habits[i];
    const def   = habitDefs[i];

    for (let day = 0; day < def.checkInDays; day++) {
      const completedDate = daysAgo(day);

      await prisma.habitCheckIn.upsert({
        where: { habitId_completedDate: { habitId: habit.id, completedDate } },
        update: {},
        create: {
          habitId:       habit.id,
          userId:        def.userId,
          completedDate,
          note:          day === 0 ? 'Feeling great today! 💪' : null,
        },
      });

      totalCheckIns++;
    }
  }

  console.info(`   ✓ ${totalCheckIns} check-ins created`);

  // ── 4. Streaks ────────────────────────────────────────────────────────────
  console.info('\n🔥 Creating streak records…');

  for (let i = 0; i < habits.length; i++) {
    const habit = habits[i];
    const def   = habitDefs[i];
    const current = def.checkInDays;
    const longest = Math.max(current, current + Math.floor(Math.random() * 10));

    await prisma.streak.upsert({
      where: { habitId: habit.id },
      update: { currentStreak: current, longestStreak: longest, lastCheckIn: daysAgo(0) },
      create: {
        habitId:       habit.id,
        userId:        def.userId,
        currentStreak: current,
        longestStreak: longest,
        lastCheckIn:   daysAgo(0),
      },
    });
  }

  console.info(`   ✓ ${habits.length} streak records upserted`);

  // ── 5. Friendships ────────────────────────────────────────────────────────
  console.info('\n🤝 Creating friendships…');

  await prisma.friendship.upsert({
    where: { requesterId_receiverId: { requesterId: alice.id, receiverId: bob.id } },
    update: {},
    create: {
      requesterId: alice.id,
      receiverId:  bob.id,
      status:      FriendshipStatus.ACCEPTED,
    },
  });

  await prisma.friendship.upsert({
    where: { requesterId_receiverId: { requesterId: bob.id, receiverId: carol.id } },
    update: {},
    create: {
      requesterId: bob.id,
      receiverId:  carol.id,
      status:      FriendshipStatus.PENDING,
    },
  });

  console.info('   ✓ alice ↔ bob   (ACCEPTED)');
  console.info('   ✓ bob  → carol  (PENDING)');

  // ── 6. Activities ─────────────────────────────────────────────────────────
  console.info('\n📜 Creating activity log…');

  const activityEntries = [
    { userId: alice.id, habitId: habits[0].id, activityType: ActivityType.HABIT_CREATED,    metadata: { title: 'Morning meditation' } },
    { userId: alice.id, habitId: habits[0].id, activityType: ActivityType.HABIT_CHECKED_IN, metadata: { streakCount: 14 } },
    { userId: alice.id, habitId: habits[0].id, activityType: ActivityType.STREAK_MILESTONE, metadata: { streakCount: 14, milestone: 14 } },
    { userId: bob.id,   habitId: habits[5].id, activityType: ActivityType.HABIT_CREATED,    metadata: { title: 'Workout' } },
    { userId: bob.id,   habitId: habits[5].id, activityType: ActivityType.HABIT_CHECKED_IN, metadata: { streakCount: 12 } },
    { userId: alice.id, habitId: null,          activityType: ActivityType.FRIENDSHIP_ADDED, metadata: { friendUsername: 'bob' } },
    { userId: carol.id, habitId: habits[6].id, activityType: ActivityType.HABIT_CREATED,    metadata: { title: 'Journaling' } },
    { userId: carol.id, habitId: habits[6].id, activityType: ActivityType.HABIT_CHECKED_IN, metadata: { streakCount: 14 } },
  ];

  await prisma.activity.createMany({
    data: activityEntries.map((a, idx) => ({
      ...a,
      metadata: a.metadata as object,
      createdAt: daysAgo(activityEntries.length - 1 - idx),
    })),
    skipDuplicates: true,
  });

  console.info(`   ✓ ${activityEntries.length} activity records created`);

  // ── 7. Notifications ──────────────────────────────────────────────────────
  console.info('\n🔔 Creating notifications…');

  const notifications = [
    { userId: alice.id, message: '🔥 You hit a 14-day streak on Morning meditation! Keep it up!', isRead: false },
    { userId: alice.id, message: '👋 Bob accepted your friend request.', isRead: true },
    { userId: bob.id,   message: '🎯 Don\'t forget to check in on your habits today!', isRead: false },
    { userId: bob.id,   message: '🤝 Carol received your friend request.', isRead: false },
    { userId: carol.id, message: '🔥 14 days of journaling — you\'re on a roll!', isRead: false },
    { userId: carol.id, message: '📬 Bob wants to be your friend on HabitLoop.', isRead: false },
  ];

  await prisma.notification.createMany({
    data: notifications,
    skipDuplicates: true,
  });

  console.info(`   ✓ ${notifications.length} notifications created`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.info('\n✨ Seed complete!\n');
  console.info('📊 Summary:');
  console.info(`   Users:         3`);
  console.info(`   Habits:        ${habits.length}`);
  console.info(`   Check-ins:     ${totalCheckIns}`);
  console.info(`   Streaks:       ${habits.length}`);
  console.info(`   Friendships:   2`);
  console.info(`   Activities:    ${activityEntries.length}`);
  console.info(`   Notifications: ${notifications.length}`);
  console.info('\n🔑 Test credentials (all use password: Password1!)');
  console.info('   alice@habitloop.dev');
  console.info('   bob@habitloop.dev');
  console.info('   carol@habitloop.dev');
}

// ─── Run ──────────────────────────────────────────────────────────────────────
main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
