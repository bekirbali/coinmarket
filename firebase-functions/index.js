const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const INCREMENT = 11.52;
const FOUR_HOURS = 10 * 60 * 1000; // 10 dakika (test için)
// const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 saat (gerçek değer)
const INACTIVITY_LIMIT = 12 * 60 * 60 * 1000; // 12 saat

// Düzenli olarak her 10 dakikada bir çalışacak fonksiyon
exports.updateMinerBalances = functions.pubsub
  .schedule("every 10 minutes")
  .onRun(async (context) => {
    // Mining yapan tüm kullanıcıları bul
    const snapshot = await db
      .collection("miners")
      .where("isMining", "==", true)
      .where("isMiningPaused", "==", false)
      .get();

    const updatePromises = [];
    const now = Date.now();

    snapshot.docs.forEach((doc) => {
      const minerData = doc.data();
      const lastUpdateTime = minerData.lastUpdateTime || 0;
      const timeElapsed = now - lastUpdateTime;

      // Son aktif zamanı kontrol et
      const lastActive = minerData.lastActive || 0;
      const inactiveTime = now - lastActive;

      // Kullanıcı 12 saatten fazla inaktifse mining'i duraklat
      if (inactiveTime > INACTIVITY_LIMIT) {
        updatePromises.push(
          db.collection("miners").doc(doc.id).update({
            isMiningPaused: true,
          })
        );
        return; // Bu kullanıcı için bakiye güncelleme işlemini atla
      }

      // Bir periyot geçip geçmediğini kontrol et
      if (timeElapsed >= FOUR_HOURS) {
        // Kaç periyot geçtiğini hesapla
        const periodsElapsed = Math.floor(timeElapsed / FOUR_HOURS);
        const totalIncrement = periodsElapsed * INCREMENT;

        // Bakiyeyi güncelle
        updatePromises.push(
          db
            .collection("miners")
            .doc(doc.id)
            .update({
              balance: admin.firestore.FieldValue.increment(totalIncrement),
              lastUpdateTime: now,
            })
        );
      }
    });

    await Promise.all(updatePromises);

    console.log(`${updatePromises.length} madenci güncellendi.`);

    return null;
  });
