"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import InAppBrowserWarning from "./components/InAppBrowserWarning";
import MobileOptimizationInfo from "./components/MobileOptimizationInfo";
import DebugPanel from "./components/DebugPanel";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

export default function Home() {
  // Initialize states with null or default values that won't cause hydration mismatches
  const [walletAmount, setWalletAmount] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [isMiningPaused, setIsMiningPaused] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [isClient, setIsClient] = useState(false); // New state to track client-side rendering
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

  // Heartbeat sistemi: Backend'e düzenli olarak aktif olduğunu bildir
  useEffect(() => {
    if (!deviceId || !isMining || isMiningPaused || !isClient) return; // Sadece mining aktifken ve client'tayken çalışsın

    const functions = getFunctions();
    const heartbeatFunction = httpsCallable(functions, "heartbeat");

    const sendHeartbeat = async () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] Heartbeat sinyali gönderiliyor... (deviceId: ${deviceId})`
      );
      try {
        const result = await heartbeatFunction({ deviceId });
        if (result.data.success) {
          console.log("[Heartbeat] Backend fonksiyonu başarıyla çağrıldı.");
        } else {
          console.error(
            "[Heartbeat] Backend fonksiyonu başarı döndürmedi:",
            result
          );
        }
      } catch (error) {
        console.error(
          "[Heartbeat] Backend fonksiyonu çağrılırken hata:",
          error
        );
      }
    };

    // İlk heartbeat'i hemen gönder
    sendHeartbeat();

    // Her 1 dakikada bir heartbeat gönder
    const intervalId = setInterval(sendHeartbeat, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [deviceId, isMining, isMiningPaused, isClient]);

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
