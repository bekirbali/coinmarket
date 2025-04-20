"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Home() {
  const [walletAmount, setWalletAmount] = useState(0);
  const [isMining, setIsMining] = useState(false);
  const [isMiningPaused, setIsMiningPaused] = useState(false);

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
    const FOUR_HOURS = 10000;
    // const INCREMENT = 11.52;
    const INCREMENT = 100;
    // const INACTIVITY_LIMIT = 8 * 60 * 60 * 1000; // 8 saat
    const INACTIVITY_LIMIT = 60000;
    let interval = null;
    let inactivityTimeout = null;

    const setupInterval = () => {
      if (interval) return;
      interval = setInterval(() => {
        setWalletAmount((prev) => {
          const newAmount = parseFloat((prev + INCREMENT).toFixed(2));
          localStorage.setItem("walletAmount", newAmount.toString());
          localStorage.setItem("lastUpdateTime", Date.now().toString());
          return newAmount;
        });
      }, FOUR_HOURS);
    };

    const resetInactivityTimer = () => {
      if (inactivityTimeout) clearTimeout(inactivityTimeout);

      inactivityTimeout = setTimeout(() => {
        console.log("8 saat inaktif -> interval durduruluyor.");
        clearInterval(interval);
        interval = null;
        setIsMiningPaused(true);
        localStorage.setItem("isMiningPaused", "true");
      }, INACTIVITY_LIMIT);
    };

    const handleActivity = () => {
      resetInactivityTimer();
      if (!interval && isMining) {
        console.log("Kullanıcı geri döndü -> interval yeniden başlatılıyor.");
        setupInterval();
        setIsMiningPaused(false);
        localStorage.setItem("isMiningPaused", "false");
      }
    };

    // Mining başlatıldıysa ve geçmiş veri varsa
    if (isMining) {
      const lastUpdateTime = localStorage.getItem("lastUpdateTime");
      const currentTime = Date.now();

      // Eğer son güncelleme zamanı varsa, geçen sürede oluşan kazancı hesapla
      if (lastUpdateTime) {
        const timeElapsed = currentTime - parseInt(lastUpdateTime);
        const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

        if (intervalsElapsed > 0) {
          setWalletAmount((prev) => {
            const newAmount = parseFloat(
              (prev + intervalsElapsed * INCREMENT).toFixed(2)
            );
            localStorage.setItem("walletAmount", newAmount.toString());
            return newAmount;
          });
        }
      }

      // Son güncelleme zamanını kaydet ve intervali başlat
      localStorage.setItem("lastUpdateTime", currentTime.toString());
      setupInterval();
      resetInactivityTimer();
      setIsMiningPaused(false);
      localStorage.setItem("isMiningPaused", "false");
    }

    // Aktivite dinleyicileri
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        handleActivity();
      }
    });

    return () => {
      clearInterval(interval);
      clearTimeout(inactivityTimeout);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("visibilitychange", handleActivity);
    };
  }, [isMining]);

  const startMining = () => {
    // Mining başlatıldığında, ilk kez lastUpdateTime'ı ayarla
    if (!localStorage.getItem("lastUpdateTime")) {
      localStorage.setItem("lastUpdateTime", Date.now().toString());
    }
    setIsMining(true);
    setIsMiningPaused(false);
    localStorage.setItem("isMining", "true");
    localStorage.setItem("isMiningPaused", "false");
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
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
