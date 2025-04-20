"use client";

import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DrawMoney() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const scrollToRef = useRef(null);
  const [copied, setCopied] = useState(false);

  const plans = [
    {
      id: 1,
      name: "3 aylık plan",
      description:
        "Kısa vadeli yatırım için uygundur. Başlangıç seviyesi için mükemmel.",
      price: "$55",
      features: [
        "Aylık çekimler",
        "Temel müşteri desteği",
        "Websitesi erişimi",
      ],
      color: "bg-blue-600",
      accent: "border-blue-700",
    },
    {
      id: 2,
      name: "6 aylık plan",
      description: "En popüler seçenek, dengeli avantajlar ve sürekliliği ile.",
      price: "$60",
      features: [
        "Aylık çekimler",
        "Öncelikli müşteri desteği",
        "Websitesi erişimi",
        "Aylık strateji toplantısı",
      ],
      color: "bg-yellow-600",
      accent: "border-yellow-700",
    },
    {
      id: 3,
      name: "1 yıllık plan",
      description:
        "En yüksek getiriler için premium uzun vadeli yatırım seçeneği.",
      price: "$65",
      features: [
        "Günlük çekimler",
        "7/24 VIP müşteri desteği",
        "Özel coinlere erişim",
        "Mobil uygulama erişimi",
        "Haftalık strateji toplantıları",
        "Yeni özelliklere erken erişim",
        "Kişisel yatırım danışmanı",
      ],
      color: "bg-purple-700",
      accent: "border-purple-800",

      recommended: true,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.1 },
    },
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    if (scrollToRef.current) {
      scrollToRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        toast.success("Kripto adresi kopyalandı!", {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Kopyalama başarısız oldu!", {
          position: "top-right",
          autoClose: 2000,
        });
      }
    );
  };

  useEffect(() => {
    if (selectedPlan && scrollToRef.current) {
      setTimeout(() => {
        scrollToRef.current.scrollIntoView({ behavior: "smooth" });
      }, 300); // 200ms delay should be enough for rendering
    }
  }, [selectedPlan]);

  return (
    <div className="max-w-6xl mx-auto p-8">
      <ToastContainer />
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Paranızı Çekin</h1>
        <div className="w-24 h-1 bg-yellow-400 mx-auto mb-6"></div>
        <p className="text-lg max-w-2xl mx-auto">
          Size en uygun ödeme planını seçin ve coin yatırımlarınızdan para
          çekmeye başlayın. Esnek planlarımız, çeşitli yatırım stratejilerine
          uyacak şekilde tasarlanmıştır.
        </p>
        <motion.div
          className="bg-gray-800 p-8 rounded-lg shadow-md text-white border-l-4 border-red-700"
          variants={itemVariants}
        >
          <p className="text-lg max-w-2xl mx-auto mt-4">
            "Almak istediğiniz paketin ücretini altında bulunan kripto hesabına
            tether usdt şeklinde etherum ağı üzerinden gönderin ve dekontunu
            Instagramdan bize iletin ( İşlem ücretini hesaba katarak ödemeyi
            yapın, eksik ödemelerde iade yapılmaz)"
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-3 gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            className={`rounded-xl overflow-hidden shadow-lg border-2 h-full flex flex-col ${
              selectedPlan === plan.id ? plan.accent : "border-transparent"
            } transition-all hover:bg-gray-50 hover:border-current`}
            variants={itemVariants}
            onClick={() => handlePlanSelect(plan.id)}
          >
            <div className={`${plan.color} text-white p-6 relative`}>
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-yellow-300 text-black font-bold py-1 px-4 transform translate-x-8 translate-y-4 rotate-45">
                  BEST VALUE
                </div>
              )}
              <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
              <p className="text-white mb-4">{plan.description}</p>
              <div className="text-4xl font-bold">{plan.price}</div>
            </div>

            <div className="p-6 bg-white flex-grow flex flex-col">
              <ul className="mb-8 space-y-3 flex-grow text-gray-800">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <motion.button
                className={`w-full py-3 px-4 rounded-lg font-bold text-white ${plan.color} hover:opacity-90 transition-opacity mt-auto border-2 border-white shadow-md`}
                whileTap={{ scale: 0.95 }}
              >
                Planı Seç
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {selectedPlan && (
        <motion.div
          ref={scrollToRef}
          className="mt-12 p-8 bg-gray-100 rounded-lg"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-2xl font-bold mb-4 text-gray-900">
            {plans.find((p) => p.id === selectedPlan)?.name}' ı seçtiniz.
          </h3>
          <p className="mb-4 text-gray-800">
            İyi seçim! Aşağıdaki kripto adresi üzerinden ödemeyi
            sağlayabilirsiniz.
          </p>
          <motion.button
            className="bg-black text-white font-bold py-3 px-4 sm:px-6 rounded-lg hover:bg-gray-800 transition-colors shadow-md inline-flex items-center text-sm sm:text-base break-all max-w-full"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              copyToClipboard("0x5dcC42Bde3395EeF8460DcDcA37E07d62270eCCe")
            }
          >
            <span className="mr-2">
              0x5dcC42Bde3395EeF8460DcDcA37E07d62270eCCe
            </span>
            <span className="flex-shrink-0 ml-1">
              {copied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
              )}
            </span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
