"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import InAppBrowserWarning from "./components/InAppBrowserWarning";
import MobileOptimizationInfo from "./components/MobileOptimizationInfo";
import DebugPanel from "./components/DebugPanel";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

export default function Home() {
  // Initialize states with null or default values that won't cause hydration mismatches
  const [walletAmount, setWalletAmount] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [isMiningPaused, setIsMiningPaused] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [isClient, setIsClient] = useState(false); // New state to track client-side rendering
  const [inactivityWorker, setInactivityWorker] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    lastUpdateTime: "Yok",
    nextUpdateTime: "Yok",
    currentTime: "Yok",
    timeLeft: "Yok",
  });

  // Set isClient to true once component mounts (client-side only)
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Cihaz ID'si oluştur veya al - client-side only now
  useEffect(() => {
    if (!isClient) return; // Skip on server

    const getOrCreateDeviceId = () => {
      let id = localStorage.getItem("deviceId");
      if (!id) {
        id =
          "device_" +
          Date.now() +
          "_" +
          Math.random().toString(36).substring(2);
        localStorage.setItem("deviceId", id);
      }
      return id;
    };

    const id = getOrCreateDeviceId();
    setDeviceId(id);
  }, [isClient]); // Only run when isClient becomes true

  // Firebase'den veri almak ve realtime güncellemeleri dinlemek için
  useEffect(() => {
    if (!deviceId || !isClient) return; // Skip on server

    const minerRef = doc(db, "miners", deviceId);

    // İlk veri kontrolü
    const checkInitialData = async () => {
      const docSnap = await getDoc(minerRef);

      if (!docSnap.exists()) {
        // Yeni kullanıcı, ilk kaydı oluştur
        await setDoc(minerRef, {
          balance: 0,
          isMining: false,
          isMiningPaused: false,
          lastUpdateTime: Date.now(),
          createdAt: Date.now(),
          lastActive: Date.now(),
        });
      } else {
        // Mevcut kullanıcı, sayfa tekrar açıldığında
        const data = docSnap.data();

        // Kullanıcı aktif olduğunu bildir
        await updateDoc(minerRef, {
          lastActive: Date.now(),
        });

        // Eğer mining durdurulmuşsa (isMiningPaused=true) ve kullanıcı mining yapmak istiyorsa (isMining=true)
        // otomatik olarak mining'i yeniden başlat
        if (data.isMiningPaused && data.isMining) {
          console.log(
            "Sayfa açıldı ve kullanıcı aktif. Mining otomatik olarak yeniden başlatılıyor..."
          );
          await updateDoc(minerRef, {
            isMiningPaused: false,
            lastUpdateTime: Date.now(), // İnaktif süre için bakiye verme
          });
        }
      }
    };

    checkInitialData();

    // Kullanıcı sayfayı yenilediğinde bile veri kaybı olmaması için,
    // tarayıcı kapanırken veya sayfa yenilenirken Firebase'e son durumu kaydet
    const handleBeforeUnload = () => {
      // Burada doğrudan updateDoc kullanamayız çünkü beforeunload sırasında
      // asenkron işlemler güvenilir çalışmaz, o yüzden sendelBeacon kullanılabilir
      // ancak basitlik için şimdilik düzenli otomatik güncellemelerle çözeceğiz
      console.log("Sayfa kapanıyor veya yenileniyor. Son durum kaydedildi.");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Realtime güncellemeleri dinle
    const unsubscribe = onSnapshot(minerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setWalletAmount(data.balance || 0);
        setIsMining(data.isMining || false);
        setIsMiningPaused(data.isMiningPaused || false);

        // Debug bilgilerini güncelle
        const currentTime = Date.now();
        const lastUpdateTime = data.lastUpdateTime;
        const FOUR_HOURS = 3 * 60 * 1000; // 3 dakika (test için)
        const nextUpdate = lastUpdateTime + FOUR_HOURS;
        const timeLeft = nextUpdate - currentTime;
        const timeElapsed = currentTime - lastUpdateTime;
        const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

        setDebugInfo({
          lastUpdateTime: new Date(lastUpdateTime).toLocaleTimeString(),
          nextUpdateTime: new Date(nextUpdate).toLocaleTimeString(),
          currentTime: new Date(currentTime).toLocaleTimeString(),
          timeLeft: `${Math.floor(timeLeft / 60000)}:${Math.floor(
            (timeLeft % 60000) / 1000
          )
            .toString()
            .padStart(2, "0")} (dk:sn)`,
          timeElapsed: `${Math.floor(timeElapsed / 60000)} dakika`,
          intervalsElapsed: intervalsElapsed.toString(),
          debugMessage:
            timeLeft < 0
              ? "Güncelleme gecikmesi var!"
              : "Sonraki güncellemeyi bekliyor",
        });
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [deviceId, isClient]);

  // Kullanıcı aktivitesini takip et
  useEffect(() => {
    if (!deviceId || !isClient) return; // Skip on server

    // Web Worker'ı başlat - browser arka planda olsa bile çalışacak
    let worker = null;
    if (window.Worker && isMining) {
      try {
        worker = new Worker("/inactivity-worker.js");
        setInactivityWorker(worker);

        // Worker başlatıldı
        worker.postMessage({ type: "start" });

        // Worker'dan gelen mesajları dinle
        worker.addEventListener("message", async (event) => {
          const message = event.data;

          if (message.type === "inactivity_detected") {
            console.log(
              `Web Worker inaktiflik tespit etti: ${Math.floor(
                message.inactiveTime / 60000
              )} dakika`
            );

            // Mining'i durdur
            const minerRef = doc(db, "miners", deviceId);
            const docSnap = await getDoc(minerRef);

            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.isMining && !data.isMiningPaused) {
                console.log("Web Worker: Mining duraklatılıyor");
                await updateDoc(minerRef, {
                  isMiningPaused: true,
                  lastInactiveTimestamp: message.timestamp,
                });
              }
            }
          }
        });
      } catch (error) {
        console.error("Web Worker oluşturulamadı:", error);
      }
    }

    // Debounce fonksiyonu - çok sık çağrıları birleştirmek için
    const debounce = (func, delay) => {
      let timeoutId;
      return function () {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(context, args), delay);
      };
    };

    // Worker'a aktivite bildir
    const updateWorkerActivity = () => {
      if (worker) {
        worker.postMessage({ type: "ping" });
      }
    };

    // Aktivite işleyicisini debounce ile geciktir
    const handleActivity = debounce(async () => {
      const minerRef = doc(db, "miners", deviceId);
      const docSnap = await getDoc(minerRef);

      // Worker'a da aktivite bildir
      updateWorkerActivity();

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Önce lastActive değerini her zaman güncelle
        await updateDoc(minerRef, {
          lastActive: Date.now(),
        });

        // Eğer mining durdurulmuşsa (isMiningPaused=true) ve kullanıcı mining yapmak istiyorsa (isMining=true)
        // otomatik olarak mining'i yeniden başlat
        if (data.isMiningPaused && data.isMining) {
          console.log("Kullanıcı aktif oldu. Mining yeniden başlatılıyor...");

          // Mining'i yeniden başlatırken lastUpdateTime'ı da güncelle
          // Böylece inaktif süre için bakiye hesaplanmayacak
          await updateDoc(minerRef, {
            isMiningPaused: false,
            lastUpdateTime: Date.now(), // ÖNEMLİ: Şimdiki zamanı kullan, inaktif süre için bakiye verme
          });
        }
      }
    }, 5000);

    // Etkinlik dinleyicileri ekle
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("scroll", handleActivity);

    // Düzenli olarak worker'a ping gönder (60 saniyede bir)
    const pingInterval = setInterval(updateWorkerActivity, 60000);

    return () => {
      // Etkinlik dinleyicilerini kaldır
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);

      // Worker'ı temizle
      if (worker) {
        worker.postMessage({ type: "stop" });
        worker.terminate();
        setInactivityWorker(null);
      }

      clearInterval(pingInterval);
    };
  }, [deviceId, isClient, isMining]);

  // Mining durumunu ve bakiyeyi periyodik olarak kontrol edip güncelle
  useEffect(() => {
    if (!deviceId || !isMining || isMiningPaused || !isClient) return; // Skip on server

    const checkAndUpdateMiningProgress = async () => {
      const minerRef = doc(db, "miners", deviceId);
      const docSnap = await getDoc(minerRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentTime = Date.now();
        const lastUpdateTime = data.lastUpdateTime;
        const lastActive = data.lastActive || 0;
        const inactiveTime = currentTime - lastActive;
        const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 dakika (test için)

        // İnaktiflik kontrolünü bakiye güncellemeden önce de yap
        if (inactiveTime > INACTIVITY_LIMIT) {
          console.log(
            `Bakiye güncellemeden önce inaktiflik tespit edildi. Mining duraklatılıyor.`
          );
          await updateDoc(minerRef, {
            isMiningPaused: true,
            lastInactiveTimestamp: currentTime,
          });
          return; // İnaktifse bakiyeyi güncelleme
        }

        const FOUR_HOURS = 3 * 60 * 1000; // 3 dakika (test için)
        const timeElapsed = currentTime - lastUpdateTime;
        const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

        // Her 3 dakikada bir bakiyeyi güncelle
        if (intervalsElapsed > 0 && data.isMining && !data.isMiningPaused) {
          // 1 periyot (3 dakika) için 11.52 coin ekle (Firebase fonksiyonuyla aynı değer)
          const INCREMENT = 11.52;
          const additionalBalance = intervalsElapsed * INCREMENT;

          // Bakiyeyi güncelle
          await updateDoc(minerRef, {
            balance: data.balance + additionalBalance,
            lastUpdateTime: lastUpdateTime + intervalsElapsed * FOUR_HOURS,
          });

          console.log(
            `Bakiye güncellendi: +${additionalBalance}. Yeni bakiye: ${
              data.balance + additionalBalance
            }`
          );
        }
      }
    };

    // İlk çağrı
    checkAndUpdateMiningProgress();

    // Her 30 saniyede bir kontrol et (daha sık kontrol ederek tutarsızlıkları azaltalım)
    const intervalId = setInterval(checkAndUpdateMiningProgress, 30000);

    return () => clearInterval(intervalId);
  }, [deviceId, isMining, isMiningPaused, isClient]);

  // Uygulama arka plana atıldığında veya öne getirildiğinde
  useEffect(() => {
    if (!deviceId || !isClient) return; // Skip on server

    const handleVisibilityChange = async () => {
      const minerRef = doc(db, "miners", deviceId);

      if (document.visibilityState === "hidden") {
        // Uygulama arka plana atıldı
        console.log(
          "Uygulama arka plana atıldı. İnaktiflik kontrolü devam ediyor..."
        );

        // Web Worker'a son aktivite bilgisi gönder
        if (inactivityWorker) {
          inactivityWorker.postMessage({ type: "ping" });
        }

        // Sadece lastActive'i güncelle, mining'i hemen durdurma
        const docSnap = await getDoc(minerRef);
        if (docSnap.exists()) {
          await updateDoc(minerRef, {
            lastActive: Date.now(), // Son aktif zamanı güncelle
          });
        }
      } else if (document.visibilityState === "visible") {
        // Uygulama tekrar öne getirildi
        console.log(
          "Uygulama tekrar öne getirildi. Kullanıcı aktif kabul ediliyor..."
        );

        // Web Worker'a son aktivite bilgisi gönder
        if (inactivityWorker) {
          inactivityWorker.postMessage({ type: "ping" });
        }

        const docSnap = await getDoc(minerRef);
        if (docSnap.exists()) {
          const data = docSnap.data();

          // Kullanıcı aktif olduğunu bildir
          await updateDoc(minerRef, {
            lastActive: Date.now(),
          });

          // Eğer mining durdurulmuşsa (isMiningPaused=true) ve kullanıcı mining yapmak istiyorsa (isMining=true)
          // otomatik olarak mining'i yeniden başlat
          if (data.isMiningPaused && data.isMining) {
            console.log("Uygulama aktif oldu. Mining yeniden başlatılıyor...");
            await updateDoc(minerRef, {
              isMiningPaused: false,
              lastUpdateTime: Date.now(), // ÖNEMLİ: Şimdiki zamanı kullan, inaktif süre için bakiye verme
            });
          }
        }
      }
    };

    // visibilitychange olayını dinle
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [deviceId, isClient, inactivityWorker]);

  const startMining = async () => {
    if (!deviceId) return;

    const minerRef = doc(db, "miners", deviceId);
    await updateDoc(minerRef, {
      isMining: true,
      isMiningPaused: false,
      lastUpdateTime: Date.now(),
      lastActive: Date.now(),
    });
  };

  const resetBalance = async () => {
    if (!deviceId) return;

    const minerRef = doc(db, "miners", deviceId);
    await updateDoc(minerRef, {
      balance: 0,
      isMining: false,
      isMiningPaused: false,
      lastUpdateTime: Date.now(),
      lastActive: Date.now(),
    });
  };

  // If not client-side yet, show a simple loading state
  if (!isClient) {
    return <div className="max-w-6xl mx-auto p-8">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <InAppBrowserWarning />
      <MobileOptimizationInfo />
      <div className="flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="md:w-1/2">
          <motion.h1
            className="text-4xl md:text-6xl font-bold mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Dijital Para Biriminin Geleceğine Hoş Geldiniz
          </motion.h1>
          <motion.p
            className="text-lg mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Yenilikçi platformumuzla bugün mining yapmaya ve coin kazanmaya
            başlayın.
          </motion.p>
          <motion.div
            className="bg-black text-white p-6 rounded-lg shadow-md mb-8"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-2">Bakiyeniz</h2>
            <motion.p
              className="text-3xl font-bold text-yellow-400"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{
                duration: 0.3,
                times: [0, 0.5, 1],
                repeat: walletAmount % 11.52 < 0.01 ? 5 : 0,
              }}
            >
              ${walletAmount.toLocaleString()}
            </motion.p>
          </motion.div>
          {!isMining ? (
            <motion.button
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-full text-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startMining}
            >
              Mining Yapmaya Başla
            </motion.button>
          ) : isMiningPaused ? (
            <div className="bg-red-500 text-white font-bold py-3 px-6 rounded-full text-lg inline-block">
              Mining Duraklatıldı
            </div>
          ) : (
            <div className="bg-green-500 text-white font-bold py-3 px-6 rounded-full text-lg inline-block">
              Mining Aktif
            </div>
          )}
          <motion.button
            className="bg-red-400 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-full text-lg transition-colors mt-4 md:mt-0 md:ml-4"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetBalance}
          >
            Bakiyeyi Sıfırla
          </motion.button>

          {/* Debug Panel */}
          <DebugPanel
            deviceId={deviceId}
            isMining={isMining}
            isMiningPaused={isMiningPaused}
            debugInfo={debugInfo}
            setDebugInfo={setDebugInfo}
          />
        </div>
        <div className="md:w-1/2 flex justify-center">
          <motion.div
            initial={{ opacity: 0, rotate: -10 }}
            animate={{ opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Mining animation - using a placeholder that simulates animation */}
            <div className="relative w-80 h-80">
              <motion.div
                className="absolute inset-0 bg-yellow-300 rounded-full opacity-70"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 0.9, 0.7],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute inset-8 bg-yellow-400 rounded-full flex items-center justify-center"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  repeat: Infinity,
                  duration: 8,
                  ease: "linear",
                }}
              >
                <span className="text-4xl font-bold">₿</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
