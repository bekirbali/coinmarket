const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();
const INCREMENT = 11.52;
const FOUR_HOURS = 3 * 60 * 1000; // 3 dakika (test için)
// const FOUR_HOURS = 4 * 60 * 60 * 1000; // 4 saat (gerçek değer)
const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 dakika (test için)
// const INACTIVITY_LIMIT = 12 * 60 * 60 * 1000; // 12 saat

// Düzenli olarak her 5 dakikada bir çalışacak fonksiyon
exports.updateMinerBalances = functions
  .runWith({
    timeoutSeconds: 300, // Fonksiyonun maksimum çalışma süresi
    memory: "256MB", // Bellek sınırı
  })
  .pubsub.schedule("every 5 minutes")
  .onRun(async (context) => {
    console.log(
      "updateMinerBalances fonksiyonu çalıştı - " + new Date().toISOString()
    );

    // Mining yapan tüm kullanıcıları bul
    const snapshot = await db
      .collection("miners")
      .where("isMining", "==", true)
      .get();

    console.log(
      `${snapshot.docs.length} adet mining yapmak isteyen kullanıcı bulundu.`
    );

    const updatePromises = [];
    const now = Date.now();

    snapshot.docs.forEach((doc) => {
      const minerData = doc.data();
      const lastUpdateTime = minerData.lastUpdateTime || 0;
      const timeElapsed = now - lastUpdateTime;

      // Son aktif zamanı kontrol et
      const lastActive = minerData.lastActive || 0;
      const inactiveTime = now - lastActive;

      console.log(`Madenci ID: ${doc.id}`);
      console.log(`Son güncelleme: ${new Date(lastUpdateTime).toISOString()}`);
      console.log(`Son aktiflik: ${new Date(lastActive).toISOString()}`);
      console.log(`İnaktif süre: ${inactiveTime / 1000 / 60} dakika`);
      console.log(`INACTIVITY_LIMIT: ${INACTIVITY_LIMIT / 1000 / 60} dakika`);
      console.log(
        `Mining durumu: ${
          minerData.isMining ? "Aktif" : "Pasif"
        }, Duraklatılmış: ${minerData.isMiningPaused ? "Evet" : "Hayır"}`
      );

      // Kullanıcı tekrar aktif olmuş mu kontrol et (inaktiflik süresi düşük ve mining duraklatılmışsa)
      if (inactiveTime < INACTIVITY_LIMIT / 2 && minerData.isMiningPaused) {
        console.log(
          `${
            doc.id
          } artık aktif durumda. Mining otomatik olarak yeniden başlatılıyor. Aktif süre: ${
            inactiveTime / 1000 / 60
          } dakika`
        );

        // Mining'i tekrar başlat
        updatePromises.push(
          db
            .collection("miners")
            .doc(doc.id)
            .update({
              isMiningPaused: false,
              lastInactivityCheck: now,
              lastUpdateTime: now,
            })
            .then(() => {
              console.log(
                `${doc.id} için mining otomatik olarak yeniden başlatıldı.`
              );
            })
            .catch((error) => {
              console.error(
                `${doc.id} için mining yeniden başlatma işlemi başarısız oldu:`,
                error
              );
            })
        );
      }
      // Kullanıcı inaktifse mining'i duraklat ve bakiye güncellemeyi atla
      else if (
        inactiveTime > INACTIVITY_LIMIT &&
        !minerData.isMiningPaused &&
        minerData.isMining
      ) {
        console.log(
          `${
            doc.id
          } inaktif olduğu için mining duraklatılıyor ve bakiye güncellenmiyor. İnaktif süre: ${
            inactiveTime / 1000 / 60
          } dakika`
        );

        // İnaktifliği güncelleme işlemini ekleyelim
        updatePromises.push(
          db
            .collection("miners")
            .doc(doc.id)
            .update({
              isMiningPaused: true,
              lastInactivityCheck: now,
              inactiveTime: inactiveTime,
              inactivityLimitMs: INACTIVITY_LIMIT,
            })
            .then(() => {
              console.log(
                `${doc.id} için inaktiflik durumu başarıyla güncellendi.`
              );
            })
            .catch((error) => {
              console.error(
                `${doc.id} için inaktiflik güncellemesi başarısız oldu:`,
                error
              );
            })
        );
        return; // Bu kullanıcı için bakiye güncelleme işlemini atla
      } else {
        // İnaktif olmayan kullanıcıların son kontrol zamanını güncelle
        updatePromises.push(
          db
            .collection("miners")
            .doc(doc.id)
            .update({
              lastInactivityCheck: now,
            })
            .catch((error) => {
              console.error(
                `${doc.id} için kontrol zamanı güncellemesi başarısız oldu:`,
                error
              );
            })
        );
      }

      // Bir periyot geçip geçmediğini kontrol et
      if (timeElapsed >= FOUR_HOURS) {
        // Kaç periyot geçtiğini hesapla
        const periodsElapsed = Math.floor(timeElapsed / FOUR_HOURS);
        const totalIncrement = periodsElapsed * INCREMENT;

        console.log(
          `${doc.id} için bakiye güncelleniyor. Geçen periyot: ${periodsElapsed}, Eklenecek miktar: ${totalIncrement}`
        );

        // Bakiyeyi güncelle
        updatePromises.push(
          db
            .collection("miners")
            .doc(doc.id)
            .update({
              balance: admin.firestore.FieldValue.increment(totalIncrement),
              lastUpdateTime: lastUpdateTime + periodsElapsed * FOUR_HOURS,
            })
        );
      } else {
        console.log(
          `${doc.id} için bakiye güncellenmedi. Geçen süre: ${
            timeElapsed / 1000 / 60
          } dakika, gereken süre: ${FOUR_HOURS / 1000 / 60} dakika`
        );
      }
    });

    await Promise.all(updatePromises);

    console.log(`${updatePromises.length} madenci güncellendi.`);
    return null;
  });

// Firebase güncelleme ve inaktiflik kontrolü için HTTP tetikleyici (manuel test için)
exports.checkAndUpdateMiner = functions.https.onRequest(async (req, res) => {
  try {
    const deviceId = req.query.deviceId;

    if (!deviceId) {
      return res.status(400).json({ error: "deviceId parametresi gerekli" });
    }

    const minerRef = db.collection("miners").doc(deviceId);
    const doc = await minerRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Madenci bulunamadı" });
    }

    const minerData = doc.data();
    const now = Date.now();
    const lastUpdateTime = minerData.lastUpdateTime || 0;
    const timeElapsed = now - lastUpdateTime;

    // Son aktif zamanı kontrol et
    const lastActive = minerData.lastActive || 0;
    const inactiveTime = now - lastActive;

    const result = {
      minerData,
      now,
      lastUpdateTime,
      timeElapsed,
      lastActive,
      inactiveTime,
      inactivityLimitHours: INACTIVITY_LIMIT / 1000 / 60 / 60,
      fourHoursMinutes: FOUR_HOURS / 1000 / 60,
      isInactive: inactiveTime > INACTIVITY_LIMIT,
      shouldUpdate:
        timeElapsed >= FOUR_HOURS &&
        minerData.isMining &&
        !minerData.isMiningPaused,
    };

    // Bakiye güncelleme testi - gerçek değişiklik yapmaz, sadece hesaplama gösterir
    if (req.query.update === "true" && result.shouldUpdate) {
      const periodsElapsed = Math.floor(timeElapsed / FOUR_HOURS);
      const totalIncrement = periodsElapsed * INCREMENT;

      result.periodsElapsed = periodsElapsed;
      result.totalIncrement = totalIncrement;
      result.newBalance = minerData.balance + totalIncrement;

      // Eğer gerçekten güncelleme isteniyorsa
      if (req.query.forceUpdate === "true") {
        await minerRef.update({
          balance: admin.firestore.FieldValue.increment(totalIncrement),
          lastUpdateTime: now,
        });
        result.updated = true;
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Hata:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Heartbeat fonksiyonu: Client'tan gelen sinyal ile lastActive zamanını günceller
exports.heartbeat = functions.https.onCall(async (data, context) => {
  // Gelen veriyi doğrula
  const deviceId = data.deviceId;
  if (!deviceId || typeof deviceId !== "string") {
    console.error("Geçersiz deviceId:", deviceId);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Fonksiyon çağrılırken geçerli bir 'deviceId' sağlanmalı."
    );
  }

  console.log(`Heartbeat alındı: ${deviceId}`);

  const minerRef = db.collection("miners").doc(deviceId);

  try {
    await minerRef.update({
      // Sunucu saatini kullanmak daha güvenilirdir
      lastActive: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`${deviceId} için lastActive güncellendi.`);
    return { success: true };
  } catch (error) {
    console.error(
      `${deviceId} için lastActive güncellenirken hata oluştu:`,
      error
    );
    // Belki doküman henüz yoktur, kontrol edilebilir veya hatayı yoksayabiliriz.
    // Şimdilik hatayı istemciye iletiyoruz.
    throw new functions.https.HttpsError(
      "unknown",
      "lastActive güncellenirken bir hata oluştu.",
      error.message
    );
  }
});
