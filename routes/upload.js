const express = require('express');
const router = express.Router();
const { uploadImage } = require('../config/cloudinary');
const { protect } = require('../middleware/auth');

// Upload single image to Cloudinary
router.post('/image', protect, async (req, res) => {
  try {
    const { image, folder = 'clothing-rental' } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await uploadImage(image, folder);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: uploadResult.url,
        public_id: uploadResult.public_id
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Image upload failed'
    });
  }
});

module.exports = router;
