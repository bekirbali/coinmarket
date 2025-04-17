"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { parse } from "next/dist/build/swc/generated-native";

export default function Home() {
  const [walletAmount, setWalletAmount] = useState(0);

  useEffect(() => {
    const storedAmount = localStorage.getItem("walletAmount");
    const lastUpdateTime = localStorage.getItem("lastUpdateTime");
    const currentTime = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    const INCREMENT = 11.52;

    if (storedAmount && lastUpdateTime) {
      const timeElapsed = currentTime - parseInt(lastUpdateTime);
      const intervalsElapsed = Math.floor(timeElapsed / FOUR_HOURS);

      if (intervalsElapsed > 0) {
        const newAmount =
          parseFloat(storedAmount) + intervalsElapsed * INCREMENT;
        const roundedAmount = parseFloat(newAmount.toFixed(2));
        setWalletAmount(roundedAmount);
        localStorage.setItem("walletAmount", roundedAmount.toString());

        // Son artış zamanını ayarla:
        const newTimestamp =
          parseInt(lastUpdateTime) + intervalsElapsed * FOUR_HOURS;
        localStorage.setItem("lastUpdateTime", newTimestamp.toString());
      } else {
        setWalletAmount(parseFloat(storedAmount));
      }
    } else if (storedAmount) {
      setWalletAmount(parseFloat(storedAmount));
    }

    const interval = setInterval(() => {
      setWalletAmount((prev) => {
        const newAmount = parseFloat((prev + INCREMENT).toFixed(2));
        localStorage.setItem("walletAmount", newAmount.toString());
        localStorage.setItem("lastUpdateTime", Date.now().toString());
        return newAmount;
      });
    }, FOUR_HOURS);

    return () => clearInterval(interval);
  }, []);

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
            Welcome to the Future of Digital Currency
          </motion.h1>
          <motion.p
            className="text-lg mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Start mining and earning coins today with our innovative platform.
          </motion.p>
          <motion.div
            className="bg-black text-white p-6 rounded-lg shadow-md mb-8"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold mb-2">Your Wallet</h2>
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
          <motion.button
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-full text-lg transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Start Mining Now
          </motion.button>
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
