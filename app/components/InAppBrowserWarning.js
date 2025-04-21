"use client";

import { useEffect, useState } from "react";

const InAppBrowserWarning = () => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    const isInstagramBrowser =
      userAgent.includes("Instagram") || userAgent.includes("FBAV");

    if (isInstagramBrowser) {
      setShowWarning(true);
    }
  }, []);

  if (!showWarning) return null;

  return (
    <div
      style={{
        background: "#fff3cd",
        border: "1px solid #ffeeba",
        padding: "15px",
        margin: "20px 0",
        borderRadius: "5px",
        color: "#856404",
      }}
    >
      ⚠️ Bu sayfa Instagram veya Facebook içindeki tarayıcıda açılmış. Mining
      özelliği düzgün çalışmayabilir.
      <strong>
        Sayfayı Chrome veya Safari gibi bir tarayıcıda yeniden açmanızı
        öneriyoruz.
      </strong>
    </div>
  );
};

export default InAppBrowserWarning;
