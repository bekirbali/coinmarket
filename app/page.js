"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import InAppBrowserWarning from "./components/InAppBrowserWarning";
import MobileOptimizationInfo from "./components/MobileOptimizationInfo";

export default function Home() {
  const [walletAmount, setWalletAmount] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [isMiningPaused, setIsMiningPaused] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    lastUpdateTime: "Yok",
    nextUpdateTime: "Yok",
    currentTime: "Yok",
    timeLeft: "Yok",
  });

  const intervalRef = useRef(null);
  const debugIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);

  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan verileri kontrol et
    const storedMiningState = localStorage.getItem("isMining");
    const storedAmount = localStorage.getItem("walletAmount");
    const storedPausedState = localStorage.getItem("isMiningPaused");

    // Mining durumunu kontrol et
    if (storedMiningState === "true") {
      setIsMining(true);
    }

    // Mining duraklatma durumunu kontrol et
    if (storedPausedState === "true") {
      setIsMiningPaused(true);
    }

    // Bakiye değerini yükle
    if (storedAmount) {
      setWalletAmount(parseFloat(storedAmount));
    }
  }, []);

  useEffect(() => {
    // const FOUR_HOURS = 4 * 60 * 60 * 1000;
    const FOUR_HOURS = 1 * 10 * 60 * 1000;
    // const FOUR_HOURS = 10000;
    const INCREMENT = 11.52;
    // const INCREMENT = 100;
    const INACTIVITY_LIMIT = 12 * 60 * 60 * 1000; // 12 saat
    // const INACTIVITY_LIMIT = 60000;

    const updateWalletBasedOnElapsedTime = () => {
      const lastUpdateTime = localStorage.getItem("lastUpdateTime");
      if (!lastUpdateTime) return;

      const currentTime = Date.now();
      const timeElapsed = currentTime - parseInt(lastUpdateTime);
      const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

      // Debug bilgisini güncelle
      setDebugInfo((prev) => ({
        ...prev,
        lastUpdateTime: new Date(parseInt(lastUpdateTime)).toLocaleTimeString(),
        currentTime: new Date(currentTime).toLocaleTimeString(),
        timeElapsed: `${Math.floor(timeElapsed / 60000)} dakika`,
        intervalsElapsed: intervalsElapsed.toString(),
      }));

      if (intervalsElapsed > 0) {
        setWalletAmount((prev) => {
          const newAmount = parseFloat(
            (prev + intervalsElapsed * INCREMENT).toFixed(2)
          );
          localStorage.setItem("walletAmount", newAmount.toString());
          localStorage.setItem("lastUpdateTime", currentTime.toString());

          // Debug bilgisini güncelle
          setDebugInfo((prevDebug) => ({
            ...prevDebug,
            lastUpdateTime: new Date(currentTime).toLocaleTimeString(),
            nextUpdateTime: new Date(
              currentTime + FOUR_HOURS
            ).toLocaleTimeString(),
            debugMessage: `Bakiye güncellendi: +${
              intervalsElapsed * INCREMENT
            }`,
          }));

          return newAmount;
        });
        // Güncelleme yapıldı, true döndür
        return true;
      }
      // Güncelleme yapılmadı, false döndür
      return false;
    };

    const setupInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      // interval'ı ayarla
      intervalRef.current = setInterval(() => {
        setWalletAmount((prev) => {
          const newAmount = parseFloat((prev + INCREMENT).toFixed(2));
          const currentTime = Date.now();
          localStorage.setItem("walletAmount", newAmount.toString());
          localStorage.setItem("lastUpdateTime", currentTime.toString());

          // Debug bilgisini güncelle
          setDebugInfo((prevDebug) => ({
            ...prevDebug,
            lastUpdateTime: new Date(currentTime).toLocaleTimeString(),
            nextUpdateTime: new Date(
              currentTime + FOUR_HOURS
            ).toLocaleTimeString(),
            debugMessage: `Bakiye otomatik güncellendi: +${INCREMENT}`,
          }));

          return newAmount;
        });
      }, FOUR_HOURS);
    };

    const resetInactivityTimer = () => {
      if (inactivityTimeoutRef.current)
        clearTimeout(inactivityTimeoutRef.current);

      inactivityTimeoutRef.current = setTimeout(() => {
        console.log("8 saat inaktif -> interval durduruluyor.");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsMiningPaused(true);
        localStorage.setItem("isMiningPaused", "true");
      }, INACTIVITY_LIMIT);
    };

    const handleActivity = () => {
      resetInactivityTimer();
      if (isMining) {
        // Her aktivitede önce geçen zamanı kontrol et ve bakiyeyi güncelle
        const updated = updateWalletBasedOnElapsedTime();

        if (!intervalRef.current) {
          console.log("Kullanıcı geri döndü -> interval yeniden başlatılıyor.");
          setupInterval();
          setIsMiningPaused(false);
          localStorage.setItem("isMiningPaused", "false");
        }
      }
    };

    // Debug bilgilerini sürekli güncelle
    const setupDebugInterval = () => {
      if (debugIntervalRef.current) clearInterval(debugIntervalRef.current);

      debugIntervalRef.current = setInterval(() => {
        const lastUpdateTime = localStorage.getItem("lastUpdateTime");
        if (lastUpdateTime && isMining && !isMiningPaused) {
          const currentTime = Date.now();
          const nextUpdate = parseInt(lastUpdateTime) + FOUR_HOURS;
          const timeLeft = nextUpdate - currentTime;

          setDebugInfo((prev) => ({
            ...prev,
            currentTime: new Date(currentTime).toLocaleTimeString(),
            nextUpdateTime: new Date(nextUpdate).toLocaleTimeString(),
            timeLeft: `${Math.floor(timeLeft / 60000)}:${Math.floor(
              (timeLeft % 60000) / 1000
            )
              .toString()
              .padStart(2, "0")} (dk:sn)`,
            debugMessage:
              timeLeft < 0
                ? "Güncelleme gecikmesi var!"
                : "Sonraki güncellemeyi bekliyor",
          }));
        }
      }, 1000);
    };

    // Mining başlatıldıysa
    if (isMining) {
      // Geçmiş sürede oluşan kazancı hesapla ve interval başlat
      updateWalletBasedOnElapsedTime();
      setupInterval();
      setupDebugInterval();
      resetInactivityTimer();
      setIsMiningPaused(false);
      localStorage.setItem("isMiningPaused", "false");

      // İlk yükleme debug bilgisi
      const lastUpdateTime = localStorage.getItem("lastUpdateTime");
      if (lastUpdateTime) {
        const currentTime = Date.now();
        const timeElapsed = currentTime - parseInt(lastUpdateTime);

        setDebugInfo((prev) => ({
          ...prev,
          lastUpdateTime: new Date(
            parseInt(lastUpdateTime)
          ).toLocaleTimeString(),
          currentTime: new Date(currentTime).toLocaleTimeString(),
          timeElapsed: `${Math.floor(timeElapsed / 60000)} dakika`,
          debugMessage:
            timeElapsed > 300000
              ? "Uzun süredir kapalıydı - kontrol edildi"
              : "Sayfa açıldı",
        }));
      }
    }

    // Gereksiz çift kontrolleri engellemek için throttle mekanizması
    let lastActivityCheck = 0;
    const ACTIVITY_THROTTLE = 500; // 500ms

    const throttledHandleActivity = () => {
      const now = Date.now();
      if (now - lastActivityCheck > ACTIVITY_THROTTLE) {
        lastActivityCheck = now;
        handleActivity();
      }
    };

    // Mobil ve masaüstü için aktivite dinleyicileri
    window.addEventListener("mousemove", throttledHandleActivity);
    window.addEventListener("keydown", throttledHandleActivity);
    window.addEventListener("touchstart", throttledHandleActivity);
    window.addEventListener("touchmove", throttledHandleActivity);
    window.addEventListener("scroll", throttledHandleActivity);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        // Sayfa görünür olduğunda geçen zamanı tam olarak hesapla
        const lastUpdateTime = localStorage.getItem("lastUpdateTime");
        if (lastUpdateTime && isMining) {
          const currentTime = Date.now();
          const timeElapsed = currentTime - parseInt(lastUpdateTime);

          // Debug bilgisini güncelle
          setDebugInfo((prev) => ({
            ...prev,
            lastUpdateTime: new Date(
              parseInt(lastUpdateTime)
            ).toLocaleTimeString(),
            currentTime: new Date(currentTime).toLocaleTimeString(),
            timeElapsed: `${Math.floor(timeElapsed / 60000)} dakika`,
            debugMessage: "Sayfa görünür oldu - geçen süre kontrol ediliyor",
          }));

          // Zamanı kontrol et ve bakiyeyi güncelle
          updateWalletBasedOnElapsedTime();

          // Interval durmuşsa yeniden başlat
          if (!intervalRef.current && !isMiningPaused) {
            setupInterval();
          }
        }

        handleActivity();
      } else {
        // Sayfa gizlendiğinde son zamanı KAYDETMİYORUZ! Sadece debug mesajını güncelle
        if (isMining) {
          setDebugInfo((prev) => ({
            ...prev,
            debugMessage:
              "Sayfa arka plana alındı - son güncelleme zamanı korunuyor",
          }));
        }
      }
    });

    // App focus/blur olayları için
    window.addEventListener("focus", handleActivity);
    window.addEventListener("blur", () => {
      // Sayfa blur olduğunda son zamanı KAYDETME
      if (isMining) {
        // localStorage.setItem("lastUpdateTime", Date.now().toString()); - BU SATIRI KALDIRDIK
        setDebugInfo((prev) => ({
          ...prev,
          debugMessage:
            "Sayfa odağını kaybetti - son güncelleme zamanı korunuyor",
        }));
      }
    });

    // Periyodik kontrolü sağlayan zamanlayıcı - daha az sıklıkta kontrol et
    const checkTimer = setInterval(() => {
      if (isMining && !isMiningPaused) {
        updateWalletBasedOnElapsedTime();
      }
    }, 300000); // 5 dakikada bir kontrol et (eskiden 1 dakika)

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(checkTimer);
      clearInterval(debugIntervalRef.current);
      clearTimeout(inactivityTimeoutRef.current);
      window.removeEventListener("mousemove", throttledHandleActivity);
      window.removeEventListener("keydown", throttledHandleActivity);
      window.removeEventListener("touchstart", throttledHandleActivity);
      window.removeEventListener("touchmove", throttledHandleActivity);
      window.removeEventListener("scroll", throttledHandleActivity);
      window.removeEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          // Sayfa görünür olduğunda geçen zamanı tam olarak hesapla
          const lastUpdateTime = localStorage.getItem("lastUpdateTime");
          if (lastUpdateTime && isMining) {
            const currentTime = Date.now();
            const timeElapsed = currentTime - parseInt(lastUpdateTime);

            // Debug bilgisini güncelle
            setDebugInfo((prev) => ({
              ...prev,
              lastUpdateTime: new Date(
                parseInt(lastUpdateTime)
              ).toLocaleTimeString(),
              currentTime: new Date(currentTime).toLocaleTimeString(),
              timeElapsed: `${Math.floor(timeElapsed / 60000)} dakika`,
              debugMessage: "Sayfa görünür oldu - geçen süre kontrol ediliyor",
            }));

            // Zamanı kontrol et ve bakiyeyi güncelle
            updateWalletBasedOnElapsedTime();

            // Interval durmuşsa yeniden başlat
            if (!intervalRef.current && !isMiningPaused) {
              setupInterval();
            }
          }

          handleActivity();
        } else {
          // Sayfa gizlendiğinde son zamanı KAYDETMİYORUZ! Sadece debug mesajını güncelle
          if (isMining) {
            setDebugInfo((prev) => ({
              ...prev,
              debugMessage:
                "Sayfa arka plana alındı - son güncelleme zamanı korunuyor",
            }));
          }
        }
      });
      window.removeEventListener("focus", handleActivity);
      window.removeEventListener("blur", handleActivity);
    };
  }, [isMining]);

  const startMining = () => {
    // Mining başlatıldığında, lastUpdateTime'ı kontrol et ve yoksa ayarla
    if (!localStorage.getItem("lastUpdateTime")) {
      localStorage.setItem("lastUpdateTime", Date.now().toString());
    }
    setIsMining(true);
    setIsMiningPaused(false);
    localStorage.setItem("isMining", "true");
    localStorage.setItem("isMiningPaused", "false");
  };

  const resetBalance = () => {
    // Bakiyeyi sıfırla
    setWalletAmount(0);
    localStorage.setItem("walletAmount", "0");

    // Mining durumunu sıfırla
    setIsMining(false);
    setIsMiningPaused(false);
    localStorage.setItem("isMining", "false");
    localStorage.setItem("isMiningPaused", "false");

    // Son güncelleme zamanını temizle
    localStorage.removeItem("lastUpdateTime");
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
                repeat: walletAmount % 500 === 0 ? 1 : 0,
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
                  </>
                )}

                {debugInfo.debugMessage && (
                  <>
                    <div className="text-gray-400 font-medium">Durum:</div>
                    <div className="text-green-400 font-semibold">
                      {debugInfo.debugMessage}
                    </div>
                  </>
                )}
              </div>
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
