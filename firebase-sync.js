/* ===== Firebase Cloud Sync Module v2 (FIXED) ===== */
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
  let app = null;

  // Initialize Firebase
  window.initFirebase = function() {
    try {
      if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded');
        return false;
      }

      // Check if already initialized
      if (firebase.apps && firebase.apps.length > 0) {
        app = firebase.apps[0];
        db = firebase.database(app);
        console.log('✅ Firebase already initialized');
      } else {
        app = firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.database(app);
        console.log('✅ Firebase initialized');
      }
      return true;
    } catch (e) {
      console.error('❌ Firebase init error:', e.message);
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
      db.ref('building/data').on('value', (snapshot) => {
        if (!snapshot.exists()) {
          console.log('📭 No data in cloud yet');
          return;
        }
        
        const cloudData = snapshot.val();
        const localData = JSON.parse(localStorage.getItem('hg_db') || '{}');
        
        // Only update if cloud is newer
        if (cloudData.lastUpdate && cloudData.lastUpdate > (localData.lastUpdate || 0)) {
          console.log('📥 Syncing from cloud...', new Date(cloudData.lastUpdate).toLocaleString());
          localStorage.setItem('hg_db', JSON.stringify(cloudData.database));
          if (typeof refresh === 'function') {
            setTimeout(() => refresh(), 500);
          }
          updateSyncStatus('synced');
        }
      }, (error) => {
        console.error('❌ Cloud read error:', error.message);
        updateSyncStatus('error');
      });

      // Register device
      db.ref(`devices/${userId}`).set({
        name: userId,
        lastOnline: Date.now(),
        timestamp: new Date().toISOString()
      }).catch(err => console.error('Device registration error:', err));

      syncEnabled = true;
      console.log(`✅ Cloud sync enabled for: ${userId}`);
      updateSyncStatus('connected');
    } catch (e) {
      console.error('❌ Cloud sync init error:', e);
      updateSyncStatus('error');
    }
  };

  // Save to cloud (called after each db.save())
  window.saveToCloud = function() {
    if (!syncEnabled || !db) {
      console.warn('⚠️ Sync not ready yet');
      return;
    }
    
    try {
      const localData = JSON.parse(localStorage.getItem('hg_db') || '{}');
      const timestamp = Date.now();
      
      const cloudPayload = {
        database: localData,
        lastUpdate: timestamp,
        lastDevice: userId,
        lastModified: new Date().toISOString()
      };

      updateSyncStatus('syncing');
      
      db.ref('building/data').set(cloudPayload).then(() => {
        console.log('✅ Saved to cloud at', new Date().toLocaleString());
        updateSyncStatus('synced');
        
        // Update device status
        db.ref(`devices/${userId}`).update({
          lastOnline: timestamp,
          timestamp: new Date().toISOString()
        });
      }).catch(err => {
        console.error('❌ Cloud save failed:', err.message);
        updateSyncStatus('error');
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

    if (status === 'synced') {
      indicator.textContent = '☁️ Synced';
      indicator.style.color = '#2f7a2f';
    } else if (status === 'syncing') {
      indicator.textContent = '🔄 Syncing...';
      indicator.style.color = '#0F4C5C';
    } else if (status === 'error') {
      indicator.textContent = '⚠️ Sync Error';
      indicator.style.color = '#a8332a';
    } else if (status === 'connected') {
      indicator.textContent = '☁️ Connected';
      indicator.style.color = '#0F4C5C';
    }
  }

  // Hook into existing save function
  window.hookCloudSync = function() {
    // Wait for save function to be defined
    let attempts = 0;
    const interval = setInterval(() => {
      if (typeof window.save === 'function' && !window.save.__cloudSyncHooked) {
        clearInterval(interval);
        
        const originalSave = window.save;
        window.save = function(data) {
          originalSave(data);
          console.log('💾 Local save called, syncing to cloud...');
          setTimeout(() => saveToCloud(), 100);
        };
        
        window.save.__cloudSyncHooked = true;
        console.log('✅ save() function hooked successfully');
      }
      
      attempts++;
      if (attempts > 50) clearInterval(interval); // Stop after 5 seconds
    }, 100);
  };

  // Manual sync button
  window.manualSync = function() {
    console.log('🔄 Manual sync started...');
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

  // Check sync status
  window.checkSyncStatus = function() {
    console.log('=== SYNC STATUS ===');
    console.log('Sync Enabled:', syncEnabled);
    console.log('User ID:', userId);
    console.log('Firebase DB:', db ? 'Connected' : 'Not connected');
    console.log('Local Data:', localStorage.getItem('hg_db') ? 'Found' : 'Not found');
    console.log('===================');
  };
})();
