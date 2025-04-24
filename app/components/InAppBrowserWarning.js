"use client";

import { useEffect, useState } from "react";

const InAppBrowserWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    const isInstagramBrowser =
      userAgent.includes("Instagram") || userAgent.includes("FBAV");

    const isOtherInAppBrowser =
      userAgent.includes("FBAN") ||
      userAgent.includes("Twitter") ||
      userAgent.includes("TikTok");

    if (isInstagramBrowser) {
      setWarningType("social");
      setShowWarning(true);
    } else if (isOtherInAppBrowser) {
      setWarningType("inapp");
      setShowWarning(true);
    }
  }, [isClient]);

  // Don't render anything on server or if no warning needed
  if (!isClient || !showWarning) return null;

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
      {warningType === "social" ? (
        <>
          ⚠️ Bu sayfa Instagram veya Facebook içindeki tarayıcıda açılmış.
          Mining özelliği düzgün çalışmayabilir.
          <strong>
            Sayfayı Chrome veya Safari gibi bir tarayıcıda yeniden açmanızı
            öneriyoruz.
          </strong>
        </>
      ) : (
        <>
          ⚠️ Bu sayfa bir uygulama içi tarayıcıda açılmış görünüyor. Mining
          özelliğinin düzgün çalışması için lütfen sayfayı normal bir tarayıcıda
          açın ve uygulamaya ekleyin.
          <br />
          <strong>
            iPhone için: Safari → Paylaş → Ana Ekrana Ekle
            <br />
            Android için: Chrome → Menü → Ana Ekrana Ekle
          </strong>
        </>
      )}
    </div>
  );
};

export default InAppBrowserWarning;
