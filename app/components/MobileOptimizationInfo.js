"use client";

import { useState, useEffect } from "react";

export default function MobileOptimizationInfo() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Move mobile detection to useEffect to run only on client
  useEffect(() => {
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
    };

    setIsMobileDevice(checkMobile());
  }, []);

  if (!isMobileDevice || !isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 z-50">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-bold">Mobil Optimizasyon Bilgisi</h3>
          <p className="text-sm mt-1">
            Mining işleminin düzgün çalışması için lütfen uygulamayı açık tutun.
            Periyodik olarak ekrana dokunmanız veya kaydırma yapmanız önerilir.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="bg-white text-blue-600 px-3 py-1 rounded-full font-bold text-sm"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}
