import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main(){
    console.log("Seeding database...");

    // Seed Categories 
    const categories = [
    { name: 'Business & Finance', slug: 'business-finance', description: 'Books about business, entrepreneurship, and finance', icon: '💼', displayOrder: 1 },
    { name: 'Self-Help & Personal Development', slug: 'self-help', description: 'Books about personal growth and self-improvement', icon: '🌟', displayOrder: 2 },
    { name: 'Psychology & Mental Health', slug: 'psychology', description: 'Books about psychology, mental health, and well-being', icon: '🧠', displayOrder: 3 },
    { name: 'Science & Technology', slug: 'science-technology', description: 'Books about science, technology, and innovation', icon: '🔬', displayOrder: 4 },
    { name: 'History & Biography', slug: 'history-biography', description: 'Books about historical events and notable people', icon: '📜', displayOrder: 5 },
    { name: 'Health & Fitness', slug: 'health-fitness', description: 'Books about health, fitness, and nutrition', icon: '💪', displayOrder: 6 },
    { name: 'Philosophy & Religion', slug: 'philosophy-religion', description: 'Books about philosophy, spirituality, and religion', icon: '🕉️', displayOrder: 7 },
    { name: 'Productivity & Time Management', slug: 'productivity', description: 'Books about productivity, efficiency, and time management', icon: '⏰', displayOrder: 8 },
    { name: 'Leadership & Management', slug: 'leadership', description: 'Books about leadership, management, and team building', icon: '👔', displayOrder: 9 },
    { name: 'Marketing & Sales', slug: 'marketing-sales', description: 'Books about marketing, sales, and customer relations', icon: '📈', displayOrder: 10 },
    { name: 'Communication & Social Skills', slug: 'communication', description: 'Books about communication and interpersonal skills', icon: '💬', displayOrder: 11 },
    { name: 'Creativity & Innovation', slug: 'creativity', description: 'Books about creativity, innovation, and design thinking', icon: '🎨', displayOrder: 12 },
  ];

  for (const category of categories) { 
    await prisma.category.upsert({
        where: { slug: category.slug},
        update: {},
        create: category
    });
  }

  console.log('Categories seeded successfully');

  /// Create an admin user




  const adminPassword = await bcrypt.hash('adminstore@12345',10);

  await prisma.user.upsert({
    where: { email: 'admin@bookstore.com'},
    update: {},
    create: {
        email: 'admin@bookstore.com',
        fullName: 'Admin User',
        passwordHash: adminPassword,
        role: 'ADMIN',
        subscriptionTier: 'LIFETIME',
        subscriptionStatus: 'ACTIVE',
        emailVerified: true,
    }
  });

  console.log('Admin user created successfully');
  

   
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });