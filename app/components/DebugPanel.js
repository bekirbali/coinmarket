import { useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { motion } from "framer-motion";

export default function DebugPanel({
  deviceId,
  isMining,
  isMiningPaused,
  debugInfo,
  setDebugInfo,
}) {
  const debugIntervalRef = useRef(null);

  // Debug bilgilerini güncellemek için
  useEffect(() => {
    if (!deviceId || !isMining) return;

    const updateDebugInfo = () => {
      const FOUR_HOURS = 10 * 60 * 1000; // 10 dakika (test için)
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

    return () => {
      clearInterval(debugIntervalRef.current);
    };
  }, [deviceId, isMining, isMiningPaused, setDebugInfo]);

  const forceBalanceCheck = async () => {
    if (!deviceId) return;

    // Bakiyeyi hemen kontrol et ve gerekirse güncelle
    const minerRef = doc(db, "miners", deviceId);
    const docSnap = await getDoc(minerRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const currentTime = Date.now();
      const lastUpdateTime = data.lastUpdateTime;
      const FOUR_HOURS = 10 * 60 * 1000; // 10 dakika (test için)
      const timeElapsed = currentTime - lastUpdateTime;
      const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

      if (intervalsElapsed > 0 && data.isMining && !data.isMiningPaused) {
        const INCREMENT = 11.52;
        const additionalBalance = intervalsElapsed * INCREMENT;

        await updateDoc(minerRef, {
          balance: data.balance + additionalBalance,
          lastUpdateTime: lastUpdateTime + intervalsElapsed * FOUR_HOURS,
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

  if (!isMining) return null;

  return (
    <div className="mt-6 bg-gray-800 p-5 rounded-lg text-sm border border-gray-700 shadow-lg">
      <h3 className="font-bold mb-3 text-lg text-yellow-400">
        Debug Bilgileri
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-gray-400 font-medium">Son güncelleme:</div>
        <div className="text-white font-semibold">
          {debugInfo.lastUpdateTime}
        </div>

        <div className="text-gray-400 font-medium">Sonraki güncelleme:</div>
        <div className="text-white font-semibold">
          {debugInfo.nextUpdateTime}
        </div>

        <div className="text-gray-400 font-medium">Şu anki zaman:</div>
        <div className="text-white font-semibold">{debugInfo.currentTime}</div>

        <div className="text-gray-400 font-medium">Kalan süre:</div>
        <div className="text-white font-semibold">{debugInfo.timeLeft}</div>

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

            <div className="text-gray-400 font-medium">Bekleyen ödül:</div>
            <div className="text-white font-semibold">
              {debugInfo.pendingReward} birim
            </div>

            <div className="text-gray-400 font-medium">Son aktif zaman:</div>
            <div className="text-white font-semibold">
              {debugInfo.lastActiveTime}
            </div>

            <div className="text-gray-400 font-medium">İnaktif süre:</div>
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
  );
}
