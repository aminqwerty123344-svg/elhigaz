/* ===== Firebase Cloud Sync Module ===== */
/* Add this to your index.html before closing </body> tag */

(function() {
  // Firebase Configuration - REPLACE WITH YOUR CONFIG
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  // Initialize Firebase (add to your HTML: <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>)
  // And: <script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js"></script>

  let syncEnabled = false;
  let userId = null;

  // Initialize sync
  window.initCloudSync = function(firebaseApp, username) {
    try {
      const database = window.firebase.database();
      userId = username || "default-user";
      
      // Get data from cloud on startup
      database.ref(`users/${userId}/data`).on('value', (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.val();
          const localData = JSON.parse(localStorage.getItem('hg_db') || '{}');
          
          // Cloud is newer, update local
          if (cloudData.lastUpdate > (localData.lastUpdate || 0)) {
            console.log('📥 Syncing from cloud...');
            localStorage.setItem('hg_db', JSON.stringify(cloudData));
            if (typeof refresh === 'function') refresh();
          }
        }
      });
      
      syncEnabled = true;
      console.log('☁️ Cloud sync enabled');
    } catch (e) {
      console.error('Cloud sync error:', e);
    }
  };

  // Save to cloud (called after each db.save())
  window.saveToCloud = function() {
    if (!syncEnabled || !userId) return;
    
    try {
      const localData = JSON.parse(localStorage.getItem('hg_db') || '{}');
      localData.lastUpdate = Date.now();
      
      const database = window.firebase.database();
      database.ref(`users/${userId}/data`).set(localData, (error) => {
        if (error) {
          console.error('❌ Cloud save failed:', error);
        } else {
          console.log('✅ Saved to cloud');
        }
      });
    } catch (e) {
      console.error('Error saving to cloud:', e);
    }
  };

  // Hook into existing save function
  if (typeof window.save === 'function') {
    const originalSave = window.save;
    window.save = function(data) {
      originalSave(data);
      saveToCloud();
    };
  }
})();
