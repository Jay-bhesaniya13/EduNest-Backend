const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs');

// Load env vars
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const app = express();
const port = 3000;

// Parse form-data with file
const upload = multer({ dest: 'uploads/' });

// Accept file upload (image/video)
app.post('/upload', upload.single('media'), async (req, res) => {
  const filePath = req.file?.path;
  const type = req.body?.type;

  if (!filePath || !type || !['img', 'video'].includes(type)) {
    return res.status(400).json({ error: 'Missing or invalid media or type (img/video)' });
  }

  try {
    const resourceType = type === 'video' ? 'video' : 'image';

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType,
      folder: 'uploads',
    });

    fs.unlinkSync(filePath); // remove local file

    res.json({
      message: `${type} uploaded successfully`,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
