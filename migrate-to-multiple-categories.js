const mongoose = require('mongoose');
const Product = require('./models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rent-the-moment', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function migrateToMultipleCategories() {
  try {
    console.log('Starting migration to multiple categories...');
    
    // Find all products that don't have categories array or have empty categories array
    const productsToUpdate = await Product.find({
      $or: [
        { categories: { $exists: false } },
        { categories: { $size: 0 } }
      ]
    });
    
    console.log(`Found ${productsToUpdate.length} products to migrate`);
    
    let updatedCount = 0;
    
    for (const product of productsToUpdate) {
      if (product.category) {
        // Set categories array to contain the existing category
        product.categories = [product.category];
        await product.save();
        updatedCount++;
        console.log(`Updated product: ${product.name} with categories: ${product.categories}`);
      }
    }
    
    console.log(`Migration completed! Updated ${updatedCount} products`);
    
    // Verify migration
    const productsWithoutCategories = await Product.find({
      $or: [
        { categories: { $exists: false } },
        { categories: { $size: 0 } }
      ]
    });
    
    console.log(`Products without categories after migration: ${productsWithoutCategories.length}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration
migrateToMultipleCategories();
