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
  const [debugInfo, setDebugInfo] = useState({
    lastUpdateTime: "Yok",
    nextUpdateTime: "Yok",
    currentTime: "Yok",
    timeLeft: "Yok",
  });
  // Add state to prevent rapid firing of status updates
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

    // İlk veri kontrolü ve kullanıcı aktifliğini bildirme (API üzerinden)
    const checkInitialDataAndNotifyActive = async () => {
      try {
        // Call the status endpoint on load to ensure initial data sync and activity notification
        console.log("İlk durum kontrolü ve aktiflik bildirimi yapılıyor...");
        const response = await fetch(`/api/mining/status?deviceId=${deviceId}`);
        if (!response.ok) {
          throw new Error(`API status call failed: ${response.statusText}`);
        }
        const data = await response.json();
        console.log("İlk durum API yanıtı:", data);
        // Initial data check in Firestore if needed (optional, as status call handles it)
        // const docSnap = await getDoc(minerRef);
        // if (!docSnap.exists()) { ... } // This logic might be handled by the API now
      } catch (error) {
        console.error("İlk durum kontrolü sırasında hata:", error);
      }
    };

    checkInitialDataAndNotifyActive();

    // Kullanıcı sayfayı yenilediğinde bile veri kaybı olmaması için,
    // tarayıcı kapanırken veya sayfa yenilenirken Firebase'e son durumu kaydet
    // This remains challenging without reliable server-side logic or sendBeacon
    const handleBeforeUnload = () => {
      console.log("Sayfa kapanıyor veya yenileniyor.");
      // Maybe send a final heartbeat sync?
      if (navigator.sendBeacon) {
        const url = `/api/heartbeat`;
        const data = JSON.stringify({ deviceId });
        navigator.sendBeacon(url, data);
        console.log("sendBeacon ile son heartbeat gönderildi.");
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Realtime güncellemeleri dinle (UI Güncellemesi için)
    const unsubscribe = onSnapshot(minerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setWalletAmount(data.balance || 0);
        setIsMining(data.isMining || false);
        setIsMiningPaused(data.isMiningPaused || false);

        // Debug bilgilerini güncelle (Bu kısım sunucu verisine dayanmalı)
        // TODO: Consider getting debug info from the /api/mining/status response
        const currentTime = Date.now();
        const lastUpdateTime =
          data.lastUpdateTime || data.createdAt || Date.now();
        const FOUR_HOURS = 4 * 60 * 60 * 1000; // Gerçek 4 saat
        const nextUpdate = lastUpdateTime + FOUR_HOURS;
        const timeLeft = nextUpdate - currentTime;
        const timeElapsed = currentTime - lastUpdateTime;
        const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

        setDebugInfo({
          lastUpdateTime: new Date(lastUpdateTime).toLocaleTimeString(),
          nextUpdateTime: new Date(nextUpdate).toLocaleTimeString(), // Bu tahminidir
          currentTime: new Date(currentTime).toLocaleTimeString(),
          timeLeft: `${Math.floor(timeLeft / 60000)}:${Math.floor(
            (timeLeft % 60000) / 1000
          )
            .toString()
            .padStart(2, "0")} (dk:sn)`, // Bu tahminidir
          timeElapsed: `${Math.floor(timeElapsed / 60000)} dakika`,
          intervalsElapsed: intervalsElapsed.toString(),
          debugMessage:
            timeLeft < 0
              ? "Sunucu güncellemesi bekleniyor/geçmiş"
              : "Sonraki sunucu kontrolünü bekliyor",
        });
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [deviceId, isClient]);

  // Heartbeat sistemi: Backend API'ye düzenli olarak aktif olduğunu bildir
  useEffect(() => {
    if (!deviceId || !isMining || isMiningPaused || !isClient) return;

    const sendHeartbeat = async () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] API'ye heartbeat gönderiliyor... (deviceId: ${deviceId})`
      );
      try {
        const response = await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (!response.ok) {
          console.error(
            `[Heartbeat] API çağrısı başarısız: ${response.statusText}`
          );
        } else {
          const result = await response.json();
          if (result.success) {
            console.log("[Heartbeat] API başarıyla çağrıldı.");
          } else {
            console.error("[Heartbeat] API başarı döndürmedi:", result);
          }
        }
      } catch (error) {
        console.error("[Heartbeat] API çağrılırken hata:", error);
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

  // Periyodik olarak sunucu tarafı bakiye kontrolünü/güncellemesini tetikle
  useEffect(() => {
    if (!deviceId || !isClient || !isMining || isMiningPaused) return; // Sadece mining aktifken ve duraklatılmamışken tetikle

    const triggerServerUpdate = async () => {
      if (isUpdatingStatus) return; // Zaten devam eden bir istek varsa yenisini başlatma
      setIsUpdatingStatus(true);
      console.log(
        `[${new Date().toLocaleTimeString()}] Sunucu tarafı durum/bakiye güncellemesi tetikleniyor...`
      );
      try {
        const response = await fetch(`/api/mining/status?deviceId=${deviceId}`);
        if (!response.ok) {
          console.error(
            `[Status Check] API çağrısı başarısız: ${response.statusText}`
          );
        } else {
          const data = await response.json();
          console.log("[Status Check] Sunucu yanıtı:", data);
          // UI güncellemesi onSnapshot tarafından halledilecek
        }
      } catch (error) {
        console.error("[Status Check] API çağrılırken hata:", error);
      } finally {
        setIsUpdatingStatus(false); // İsteği tamamlandı olarak işaretle
      }
    };

    // Her 1 dakikada bir sunucu kontrolünü tetikle
    const intervalId = setInterval(triggerServerUpdate, 60 * 1000); // 1 dakika

    return () => clearInterval(intervalId);
  }, [deviceId, isClient, isMining, isMiningPaused, isUpdatingStatus]);

  const startMining = async () => {
    if (!deviceId) return;

    try {
      const response = await fetch("/api/mining/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      if (!response.ok) {
        throw new Error(`API start call failed: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        console.log("Mining başlatma isteği başarılı.");
        // UI state will update via onSnapshot listening to Firestore changes
      } else {
        console.error("Mining başlatılamadı (API):", result.error);
      }
    } catch (error) {
      console.error("Mining başlatılırken hata:", error);
    }
  };

  // Reset Balance needs careful consideration. Maybe an API endpoint too?
  // For now, keep it client-side but acknowledge it's less secure if strict rules aren't enforced.
  const resetBalance = async () => {
    if (!deviceId) return;
    console.warn(
      "Bakiyeyi sıfırlama işlemi yapılıyor (Güvenlik kuralları önemli!)."
    );
    const minerRef = doc(db, "miners", deviceId);
    try {
      await updateDoc(minerRef, {
        balance: 0,
        isMining: false,
        isMiningPaused: false,
        lastUpdateTime: Date.now(), // Use client time here, server would use serverTimestamp
        lastActive: Date.now(),
      });
      console.log("Bakiye sıfırlandı (Client-side).");
    } catch (error) {
      console.error("Bakiye sıfırlanırken hata:", error);
    }
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
              $
              {walletAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
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
              Mining Duraklatıldı (Inaktif)
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
            Bakiyeyi Sıfırla (Test)
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
            {/* Mining animation */}
            <div className="relative w-80 h-80">
              <motion.div
                className="absolute inset-0 bg-yellow-300 rounded-full opacity-70"
                animate={
                  isMining && !isMiningPaused
                    ? {
                        scale: [1, 1.1, 1],
                        opacity: [0.7, 0.9, 0.7],
                      }
                    : { scale: 1, opacity: 0.5 }
                }
                transition={
                  isMining && !isMiningPaused
                    ? {
                        repeat: Infinity,
                        duration: 2,
                        ease: "easeInOut",
                      }
                    : { duration: 0.5 }
                }
              />
              <motion.div
                className="absolute inset-8 bg-yellow-400 rounded-full flex items-center justify-center"
                animate={
                  isMining && !isMiningPaused
                    ? {
                        rotate: 360,
                      }
                    : { rotate: 0 }
                }
                transition={
                  isMining && !isMiningPaused
                    ? {
                        repeat: Infinity,
                        duration: 8,
                        ease: "linear",
                      }
                    : { duration: 0.5 }
                }
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
