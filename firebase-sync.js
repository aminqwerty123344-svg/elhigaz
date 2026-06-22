/* ===== Firebase Cloud Sync Module ===== */
/* Real-time data synchronization across devices */

(function() {
  // Firebase Configuration
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBnwyB31eHF84XeuDfKWE4Wjw6hMcy9BVw",
    authDomain: "elhejaz-mangment-system.firebaseapp.com",
    projectId: "elhejaz-mangment-system",
    storageBucket: "elhejaz-mangment-system.firebasestorage.app",
    messagingSenderId: "1002132762211",
    appId: "1:1002132762211:web:32d20f9a112004fa719256",
    measurementId: "G-SGQ6DFCLD0"
  };

  let syncEnabled = false;
  let userId = null;
  let db = null;

  // Initialize Firebase
  window.initFirebase = function() {
    try {
      if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded. Add Firebase scripts to index.html');
        return false;
      }

      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.database();
      console.log('✅ Firebase initialized');
      return true;
    } catch (e) {
      console.error('Firebase init error:', e);
      return false;
    }
  };

  // Initialize sync with device name
  window.initCloudSync = function(deviceName) {
    if (!db) {
      if (!window.initFirebase()) return;
    }

    userId = deviceName || `device_${Date.now()}`;
    
    try {
      // Listen to cloud changes in real-time
      db.ref(`building/data`).on('value', (snapshot) => {
        if (!snapshot.exists()) return;
        
        const cloudData = snapshot.val();
        const localData = JSON.parse(localStorage.getItem('hg_db') || '{}');
        
        // Only update if cloud is newer
        if (cloudData.lastUpdate && cloudData.lastUpdate > (localData.lastUpdate || 0)) {
          console.log('📥 Syncing from cloud...');
          localStorage.setItem('hg_db', JSON.stringify(cloudData.database));
          if (typeof refresh === 'function') {
            setTimeout(() => refresh(), 500);
          }
        }
      });

      // Also listen for device list
      db.ref(`devices/${userId}`).set({
        name: userId,
        lastOnline: Date.now(),
        timestamp: new Date().toISOString()
      });

      syncEnabled = true;
      console.log(`☁️ Cloud sync enabled for: ${userId}`);
      
      // Show sync status in UI
      updateSyncStatus('connected');
    } catch (e) {
      console.error('Cloud sync error:', e);
      updateSyncStatus('error');
    }
  };

  // Save to cloud (called after each db.save())
  window.saveToCloud = function() {
    if (!syncEnabled || !db) return;
    
    try {
      const localData = JSON.parse(localStorage.getItem('hg_db') || '{}');
      const timestamp = Date.now();
      
      const cloudPayload = {
        database: localData,
        lastUpdate: timestamp,
        lastDevice: userId,
        lastModified: new Date().toISOString()
      };

      db.ref('building/data').set(cloudPayload, (error) => {
        if (error) {
          console.error('❌ Cloud save failed:', error);
          updateSyncStatus('error');
        } else {
          console.log('✅ Saved to cloud');
          updateSyncStatus('connected');
        }
      });

      // Update device last online
      db.ref(`devices/${userId}`).update({
        lastOnline: timestamp,
        timestamp: new Date().toISOString()
      });

    } catch (e) {
      console.error('Error saving to cloud:', e);
      updateSyncStatus('error');
    }
  };

  // Update sync status in UI
  function updateSyncStatus(status) {
    const indicator = document.getElementById('syncStatus');
    if (!indicator) return;

    if (status === 'connected') {
      indicator.textContent = '☁️ Synced';
      indicator.style.color = '#2f7a2f';
    } else if (status === 'error') {
      indicator.textContent = '⚠️ Sync Error';
      indicator.style.color = '#a8332a';
    } else {
      indicator.textContent = '🔄 Syncing...';
      indicator.style.color = '#0F4C5C';
    }
  }

  // Hook into existing save function
  window.hookCloudSync = function() {
    if (typeof window.save !== 'function') {
      console.warn('save() function not found');
      return;
    }

    const originalSave = window.save;
    window.save = function(data) {
      originalSave(data);
      updateSyncStatus('syncing');
      setTimeout(() => saveToCloud(), 100);
    };

    console.log('✅ save() function hooked to cloud sync');
  };

  // Manual sync button
  window.manualSync = function() {
    console.log('🔄 Manual sync started...');
    updateSyncStatus('syncing');
    saveToCloud();
  };

  // Get devices list
  window.getConnectedDevices = function(callback) {
    if (!db) return;
    
    db.ref('devices').on('value', (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      }
    });
  };
})();
