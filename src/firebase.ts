import { initializeApp, getApp, getApps, deleteApp } from 'firebase/app';
import { 
  getAuth, signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, updatePassword 
} from 'firebase/auth';
import { 
  getFirestore, doc, setDoc, getDoc, getDocs, collection, onSnapshot, 
  serverTimestamp, deleteDoc, updateDoc, addDoc, query, where, limit, 
  getDocFromServer, collectionGroup 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Function to create a user using a secondary app instance
// This allows the admin to create a user without being logged out
export const createNewUser = async (email: string, pass: string) => {
  const appName = `Secondary_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    return userCredential.user;
  } catch (error) {
    try {
      await deleteApp(secondaryApp);
    } catch (e) {
      console.error('Error deleting secondary app:', e);
    }
    throw error;
  }
};

export { 
  doc, setDoc, getDoc, getDocs, collection, onSnapshot, serverTimestamp, 
  signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  signOut, onAuthStateChanged, deleteDoc, updateDoc, addDoc, query, where, limit, 
  getDocFromServer, ref, uploadBytes, getDownloadURL, collectionGroup, updatePassword 
};
export type { User };
