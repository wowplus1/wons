const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

const envContent = fs.readFileSync('.env.local', 'utf8');
const getEnvVar = (key) => {
  const match = envContent.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : '';
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log('Fetching all catalog items to delete...');
  const snap = await getDocs(collection(db, 'catalog'));
  console.log(`Found ${snap.size} catalog items to remove.`);
  
  if (snap.size === 0) {
    console.log('No catalog items found. Exiting.');
    return;
  }
  
  const batch = writeBatch(db);
  snap.forEach((document) => {
    batch.delete(doc(db, 'catalog', document.id));
  });
  
  await batch.commit();
  console.log('Successfully deleted all catalog items from Firestore.');
}

run().catch(console.error);
