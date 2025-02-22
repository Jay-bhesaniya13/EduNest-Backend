// const admin = require('firebase-admin');

// const serviceAccount = require('./edunest-ce-firebase-adminsdk-fbsvc-e0a68de534.json');

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// module.exports = { admin, db };

const admin = require('firebase-admin');

const serviceAccount = require('./edunest-ce-firebase-adminsdk-fbsvc-e0a68de534.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ✅ Extract projectId from serviceAccount JSON
const projectId = serviceAccount.project_id; 

module.exports = { admin, db, projectId }; // ✅ Now exports projectId properly
