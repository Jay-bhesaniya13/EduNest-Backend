const { admin, db } = require('./firebase'); // No need for bucket
const path = require('path');
const fs = require('fs');

// Function to upload metadata to Firestore (for a file)
async function uploadMetadataToFirestore(filePath, userId) {
  try {
    // Generate a unique file name based on the current timestamp
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}_${path.basename(filePath)}`;
    
    // Here, we assume the file is stored elsewhere (or not uploading it in Firebase Storage)
    const fileUrl = `https://your-storage-location.com/${fileName}`;

    // Save metadata in Firestore (no file is uploaded here)
    await db.collection('content').add({
      userId: userId,
      fileName: fileName,
      fileUrl: fileUrl, // Where the file is located (it could be on your server or another service)
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('File metadata uploaded successfully');
  } catch (error) {
    console.error('Error uploading file metadata:', error);
  }
}

// Test the upload function
const filePath = 'uploads/sample.jpg'; // Path to the file you want to upload
const userId = 'user123'; // Replace with your user identifier
uploadMetadataToFirestore(filePath, userId);
