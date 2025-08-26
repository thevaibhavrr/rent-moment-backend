const mongoose = require('mongoose');
const Product = require('./models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloths_rental', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixDuplicateSlugs() {
  try {
    console.log('Starting to fix duplicate slugs...');
    
    // Get all products grouped by slug
    const products = await Product.find({}).sort({ createdAt: 1 });
    const slugGroups = {};
    
    // Group products by slug
    products.forEach(product => {
      if (product.slug) {
        if (!slugGroups[product.slug]) {
          slugGroups[product.slug] = [];
        }
        slugGroups[product.slug].push(product);
      }
    });
    
    // Fix duplicate slugs
    for (const [slug, productList] of Object.entries(slugGroups)) {
      if (productList.length > 1) {
        console.log(`Found ${productList.length} products with slug: ${slug}`);
        
        // Keep the first product with the original slug, update others
        for (let i = 1; i < productList.length; i++) {
          const product = productList[i];
          const newSlug = `${slug}-${i}`;
          
          console.log(`Updating product "${product.name}" (${product._id}) from "${slug}" to "${newSlug}"`);
          
          await Product.findByIdAndUpdate(product._id, { slug: newSlug });
        }
      }
    }
    
    console.log('Duplicate slugs fixed successfully!');
    
    // Verify no duplicates remain
    const allProducts = await Product.find({});
    const allSlugs = allProducts.map(p => p.slug).filter(Boolean);
    const uniqueSlugs = new Set(allSlugs);
    
    if (allSlugs.length === uniqueSlugs.size) {
      console.log('✅ Verification passed: No duplicate slugs found');
    } else {
      console.log('❌ Verification failed: Duplicate slugs still exist');
    }
    
  } catch (error) {
    console.error('Error fixing duplicate slugs:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the migration
fixDuplicateSlugs();
