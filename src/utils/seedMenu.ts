// Seed menu items for all categories (main, chicken, salad, dessert, beverage, appetizer)
import prisma from '../utils/prisma';

async function seedMenu() {
  // Delete all related data in the correct order to allow menu item deletion
  await prisma.payment.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});

  // Get a branch to assign menu items to
  const branch = await prisma.branch.findFirst();
  if (!branch) throw new Error('No branch found. Please seed branches first.');

  const menuItems = [
    { name: 'Bruschetta', description: 'Grilled bread with tomatoes, garlic, basil, and olive oil.', price: 7, category: 'appetizer', isAvailable: true, image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Caesar Salad', description: 'Romaine lettuce, parmesan, croutons, Caesar dressing.', price: 9, category: 'salad', isAvailable: true, image: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'French Onion Soup', description: 'Classic soup with caramelized onions and melted cheese.', price: 8, category: 'soup', isAvailable: true, image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Margherita Pizza', description: 'Tomato, mozzarella, basil, olive oil.', price: 14, category: 'pizza', isAvailable: true, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Spaghetti Carbonara', description: 'Pasta with pancetta, egg, parmesan, and black pepper.', price: 16, category: 'pasta', isAvailable: true, image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Grilled Salmon', description: 'Salmon fillet with lemon butter sauce.', price: 22, category: 'main', isAvailable: true, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Ribeye Steak', description: 'Juicy, marbled ribeye steak grilled to perfection.', price: 28, category: 'main', isAvailable: true, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Chicken Parmesan', description: 'Breaded chicken breast, marinara, mozzarella.', price: 18, category: 'main', isAvailable: true, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Vegetable Stir Fry', description: 'Seasonal vegetables, soy sauce, ginger, garlic.', price: 15, category: 'vegetarian', isAvailable: true, image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Garlic Bread', description: 'Toasted bread with garlic butter.', price: 6, category: 'side', isAvailable: true, image: 'https://images.unsplash.com/photo-1619881589959-af0c818d229a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Truffle Fries', description: 'Crispy fries tossed with truffle oil and parmesan.', price: 8, category: 'side', isAvailable: true, image: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Tiramisu', description: 'Coffee-soaked ladyfingers, mascarpone, cocoa.', price: 8, category: 'dessert', isAvailable: true, image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with molten center.', price: 9, category: 'dessert', isAvailable: true, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Panna Cotta', description: 'Creamy Italian dessert with berry sauce.', price: 7, category: 'dessert', isAvailable: true, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Espresso', description: 'Rich Italian coffee.', price: 3, category: 'beverage', isAvailable: true, image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Fresh Lemonade', description: 'Homemade lemonade with fresh lemons.', price: 4, category: 'beverage', isAvailable: true, image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Red Wine', description: 'Glass of house red wine.', price: 7, category: 'beverage', isAvailable: true, image: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
    { name: 'Sparkling Water', description: 'Chilled sparkling mineral water.', price: 3, category: 'beverage', isAvailable: true, image: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: (await prisma.menuItem.findFirst({ where: { name: item.name, branchId: branch.id } }))?.id || 0 },
      update: item,
      create: { ...item, branch: { connect: { id: branch.id } } },
    });
  }
  console.log('Menu seeded!');
}

seedMenu().finally(() => prisma.$disconnect());
