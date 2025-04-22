"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import InAppBrowserWarning from "./components/InAppBrowserWarning";
import MobileOptimizationInfo from "./components/MobileOptimizationInfo";
import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

export default function Home() {
  const [walletAmount, setWalletAmount] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [isMiningPaused, setIsMiningPaused] = useState(false);
  const [deviceId, setDeviceId] = useState("");
  const [debugInfo, setDebugInfo] = useState({
    lastUpdateTime: "Yok",
    nextUpdateTime: "Yok",
    currentTime: "Yok",
    timeLeft: "Yok",
  });

  const debugIntervalRef = useRef(null);

  // Cihaz ID'si oluştur veya al
  useEffect(() => {
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
  }, []);

  // Firebase'den veri almak ve realtime güncellemeleri dinlemek için
  useEffect(() => {
    if (!deviceId) return;

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
        // Mevcut kullanıcının başlangıçta aktif olduğunu bildir
        await updateDoc(minerRef, {
          lastActive: Date.now(),
        });
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
        const FOUR_HOURS = 5 * 60 * 1000; // 5 dakika
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
  }, [deviceId]);

  // Debug bilgilerini güncellemek için
  useEffect(() => {
    if (!deviceId || !isMining) return;

    const updateDebugInfo = () => {
      const FOUR_HOURS = 5 * 60 * 1000; // 5 dakika
      const minerRef = doc(db, "miners", deviceId);

      getDoc(minerRef).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const currentTime = Date.now();
          const lastUpdateTime = data.lastUpdateTime;
          const nextUpdate = lastUpdateTime + FOUR_HOURS;
          const timeLeft = nextUpdate - currentTime;
          const timeElapsed = currentTime - lastUpdateTime;
          const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

          // Hesaplanan değerleri ekleyelim
          const INCREMENT = 11.52;
          const pendingReward =
            intervalsElapsed > 0
              ? (intervalsElapsed * INCREMENT).toFixed(2)
              : "0";
          const nextRewardTime = new Date(nextUpdate).toLocaleTimeString();

          // Firebase'e son aktif zamanı sürekli gönder (telefondan kullanıyorsanız önemli)
          if (data.lastActive && currentTime - data.lastActive > 60000) {
            updateDoc(doc(db, "miners", deviceId), {
              lastActive: currentTime,
            });
            console.log(
              "lastActive otomatik güncellendi: " +
                new Date(currentTime).toLocaleTimeString()
            );
          }

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
            lastActiveTime: new Date(data.lastActive).toLocaleTimeString(),
            inactiveTime: `${Math.floor(
              (currentTime - data.lastActive) / 60000
            )} dakika`,
            pendingReward: pendingReward,
            nextRewardTime: nextRewardTime,
            debugMessage:
              timeLeft < 0
                ? `Güncelleme gecikmesi var! Beklenen ödül: ${pendingReward} birim. Bakiye güncellemesi 5 dakikada bir yapılır.`
                : "Sonraki güncellemeyi bekliyor",
          });
        }
      });
    };

    // Her saniye debug bilgilerini güncelle
    debugIntervalRef.current = setInterval(updateDebugInfo, 1000);

    // Sayfa görünürlüğü değiştiğinde Firebase'i bilgilendir
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && deviceId) {
        updateDoc(doc(db, "miners", deviceId), {
          lastActive: Date.now(),
        });
      }
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(debugIntervalRef.current);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [deviceId, isMining]);

  // Kullanıcı aktivitesini takip et
  useEffect(() => {
    if (!deviceId) return;

    const handleActivity = () => {
      updateDoc(doc(db, "miners", deviceId), {
        lastActive: Date.now(),
      });
    };

    // Etkinlik dinleyicileri ekle
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("scroll", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("scroll", handleActivity);
    };
  }, [deviceId]);

  // Mining durumunu ve bakiyeyi periyodik olarak kontrol edip güncelle
  useEffect(() => {
    if (!deviceId || !isMining || isMiningPaused) return;

    const checkAndUpdateMiningProgress = async () => {
      const minerRef = doc(db, "miners", deviceId);
      const docSnap = await getDoc(minerRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentTime = Date.now();
        const lastUpdateTime = data.lastUpdateTime;
        const FOUR_HOURS = 5 * 60 * 1000; // 5 dakika
        const timeElapsed = currentTime - lastUpdateTime;
        const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

        // Her 5 dakikada bir bakiyeyi güncelle
        if (intervalsElapsed > 0 && data.isMining && !data.isMiningPaused) {
          // 1 periyot (5 dakika) için 11.52 coin ekle (Firebase fonksiyonuyla aynı değer)
          const INCREMENT = 11.52;
          const additionalBalance = intervalsElapsed * INCREMENT;

          // Bakiyeyi güncelle
          await updateDoc(minerRef, {
            balance: data.balance + additionalBalance,
            lastUpdateTime: lastUpdateTime + intervalsElapsed * FOUR_HOURS,
            lastActive: currentTime,
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
  }, [deviceId, isMining, isMiningPaused]);

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

  const forceBalanceCheck = async () => {
    if (!deviceId) return;

    // Bakiyeyi hemen kontrol et ve gerekirse güncelle
    const minerRef = doc(db, "miners", deviceId);
    const docSnap = await getDoc(minerRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentTime = Date.now();
      const lastUpdateTime = data.lastUpdateTime;
      const FOUR_HOURS = 5 * 60 * 1000; // 5 dakika
      const timeElapsed = currentTime - lastUpdateTime;
      const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

      if (intervalsElapsed > 0 && data.isMining && !data.isMiningPaused) {
        const INCREMENT = 11.52;
        const additionalBalance = intervalsElapsed * INCREMENT;

        await updateDoc(minerRef, {
          balance: data.balance + additionalBalance,
          lastUpdateTime: lastUpdateTime + intervalsElapsed * FOUR_HOURS,
          lastActive: currentTime,
        });

        console.log(
          `Bakiye manuel güncellendi: +${additionalBalance}. Yeni bakiye: ${
            data.balance + additionalBalance
          }`
        );
      } else {
        console.log("Güncelleme için yeterli süre geçmemiş.");
      }
    }
  };

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
          {isMining && (
            <div className="mt-6 bg-gray-800 p-5 rounded-lg text-sm border border-gray-700 shadow-lg">
              <h3 className="font-bold mb-3 text-lg text-yellow-400">
                Debug Bilgileri
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-gray-400 font-medium">Son güncelleme:</div>
                <div className="text-white font-semibold">
                  {debugInfo.lastUpdateTime}
                </div>

                <div className="text-gray-400 font-medium">
                  Sonraki güncelleme:
                </div>
                <div className="text-white font-semibold">
                  {debugInfo.nextUpdateTime}
                </div>

                <div className="text-gray-400 font-medium">Şu anki zaman:</div>
                <div className="text-white font-semibold">
                  {debugInfo.currentTime}
                </div>

                <div className="text-gray-400 font-medium">Kalan süre:</div>
                <div className="text-white font-semibold">
                  {debugInfo.timeLeft}
                </div>

                {debugInfo.timeElapsed && (
                  <>
                    <div className="text-gray-400 font-medium">Geçen süre:</div>
                    <div className="text-white font-semibold">
                      {debugInfo.timeElapsed}
                    </div>

                    <div className="text-gray-400 font-medium">
                      Geçen periyot sayısı:
                    </div>
                    <div className="text-white font-semibold">
                      {debugInfo.intervalsElapsed}
                    </div>

                    <div className="text-gray-400 font-medium">
                      Bekleyen ödül:
                    </div>
                    <div className="text-white font-semibold">
                      {debugInfo.pendingReward} birim
                    </div>

                    <div className="text-gray-400 font-medium">
                      Son aktif zaman:
                    </div>
                    <div className="text-white font-semibold">
                      {debugInfo.lastActiveTime}
                    </div>

                    <div className="text-gray-400 font-medium">
                      İnaktif süre:
                    </div>
                    <div className="text-white font-semibold">
                      {debugInfo.inactiveTime}
                    </div>
                  </>
                )}

                {debugInfo.debugMessage && (
                  <>
                    <div className="text-gray-400 font-medium">Durum:</div>
                    <div
                      className={
                        debugInfo.debugMessage.includes("Güncelleme gecikmesi")
                          ? "text-yellow-400 font-semibold"
                          : "text-green-400 font-semibold"
                      }
                    >
                      {debugInfo.debugMessage}
                    </div>
                  </>
                )}
              </div>

              <button
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                onClick={forceBalanceCheck}
              >
                Bakiyeyi Güncelle
              </button>
            </div>
          )}
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
