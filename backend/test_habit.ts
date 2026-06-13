import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) return console.log("No user");
  
  const h = await prisma.habit.create({
    data: {
      userId: user.id,
      title: "Test Habit",
      frequency: "DAILY",
      streak: {
        create: {
          userId: user.id,
          currentStreak: 0,
          longestStreak: 0
        }
      }
    },
    include: { streak: true }
  });
  console.log("Created Habit Streak:", h.streak);
}

run().catch(console.error).finally(() => prisma.$disconnect());
