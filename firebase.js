import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
    getDatabase
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD5KnoOye-Ns7RNQq9KqGNSmakYydIoLAw",
  authDomain: "my-store-4f430.firebaseapp.com",
  databaseURL: "https://my-store-4f430-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "my-store-4f430",
  storageBucket: "my-store-4f430.firebasestorage.app",
  messagingSenderId: "674007434765",
  appId: "1:674007434765:web:c4005d096ab86167cc3744"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
