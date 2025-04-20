"use client";

import { motion } from "framer-motion";

export default function AboutUs() {
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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <motion.div
        className="mb-12 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Hakkımızda</h1>
        <div className="w-24 h-1 bg-yellow-400 mx-auto"></div>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-1 gap-12 mb-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-2xl font-bold mb-4">Misyonumuz</h2>
          <p className="text-lg leading-relaxed mb-6">
            BTC Mining olarak, insanların dijital para birimleriyle etkileşim
            kurma şeklini değiştirmeye kendimizi adadık. Platformumuz, en son
            teknoloji ve kullanıcı dostu arayüzü ile coin madenciliği ve
            yönetimi için kesintisiz bir deneyim sunuyor.
          </p>
          <p className="text-lg leading-relaxed">
            BTC Mining 2022 yılında kurulan ve kullanıcılarına bitcoin miningi
            hakkında kolaylıklar sağlamayı hedefleyen bir projedir. BTC Mining
            sayesinde siz değerli kullanıcılarımızın yüzbinlerce liralık mining
            setupları kurmadan sadece telefonunuz yada bilgisayarınız ile
            dijital madencilik yapmanızı sağlayan bir mining projesidir. Tek
            yapmanız gereken telefonunuz ya da bilgisayarınız üzerinden
            uygulamaya giriş yapmak. Ardından arkanıza yaslanın ve yeni neslin
            dijital madenciliğinin tadını çıkarın.
          </p>
          <p>
            <span className="block my-2 font-semibold">NASIL ÇALIŞIR?</span> BTC
            Mining uygulaması, siz değerli müşterilerimizin telefonun ya da
            bilgisayarının işletim sistemini kullanarak bitcoin madenciliği
            yapmanızı sağlar. Ayrıca arka planda BTC Mining çalışırken ağır
            programlar çalıştırmamaya özen gösterin bu miningin yavaşlamasına
            neden olur.
          </p>
          <p>
            <span className="block my-2 font-semibold">
              NASIL PARA ÇEKİLİR?
            </span>
            Kazmış olduğunuz bitcoinleri çekmek istediğinizde tek yapmanız
            gereken para çek bölümüne gelip size uygun olan paketi seçip, kripto
            adresine ödemeyi göndermek ödemeyi gönderdikten sonra dekontunu
            Instagram DM' si üzerinde 7/24 aktif olan adminlerimize göndermek,
            ardından çekim yapmak istediğinizi belirtin ve adminlerimize iban
            yada bir kripto cüzdanı gönderin. Elinizdeki bitcoinlerin dolar
            değeri size direkt ödeme olarak yapılıcaktır
          </p>
        </motion.div>
        <motion.div
          className="bg-gray-800 p-8 rounded-lg shadow-md text-white border-l-4 border-red-700"
          variants={itemVariants}
        >
          <h2 className="text-2xl font-bold mb-4 ">Uyarı!</h2>
          <p className="text-lg leading-relaxed mb-6">
            Sevgili kullanıcılarımız bitcoin mininginin sorunsuz bir şekilde
            ilerlemesi için en az 12 saatte bir siteye giriş yapmanız ve sayfayı
            yenilemeniz gerekmektedir aksi takdirde mining de duraksamalar
            meydana gelebilir kafanızda ki tüm sorunları gidermek için Instagram
            üzerinde 7/24 aktif adminlerimize Dm üzerinden ulaşabilirsiniz
          </p>
        </motion.div>

        <motion.div
          className="bg-gray-800 p-8 rounded-lg shadow-lg border-l-4 border-yellow-400 text-white"
          variants={itemVariants}
        >
          <h2 className="text-2xl font-bold mb-4">İletişim Bilgileri</h2>
          <ul className="space-y-4">
            <li className="flex items-center">
              <span className="mr-3 text-yellow-400">📍</span>
              <span>143 Blockchain Avenue, Digital City, 10182</span>
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-yellow-400">📧</span>
              <span>btc.mining@gmail.com</span>
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-yellow-400">📞</span>
              <span>+44 020 8032 0456</span>
            </li>
            <li className="flex items-center">
              <span className="mr-3 text-yellow-400">⏰</span>
              <span>Monday - Friday, 9am - 5pm EST</span>
            </li>
            <li className="flex items-center">
              <span className="mr-3">
                <img src="/instaicon.png" alt="Instagram" className="w-5 h-5" />
              </span>
              <span>
                <a
                  href="https://www.instagram.com/bitcoin.miningtr?igsh=ZzA2cjMza3k2OG0x"
                  target="_blank"
                  className="text-yellow-400 hover:underline"
                >
                  Instagram
                </a>
              </span>
            </li>
          </ul>
        </motion.div>
      </motion.div>

      {/* <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Sosyal Medya</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              name: "Instagram",
              icon: "📸",
              url: "https://instagram.com/coinsite",
              description: "Güncellemeler için bizi takip edin",
            },
            {
              name: "Twitter",
              icon: "🐦",
              url: "https://twitter.com/coinsite",
              description: "En son haberleri ve duyuruları takip edin",
            },
            {
              name: "Telegram",
              icon: "📱",
              url: "https://t.me/coinsite",
              description: "Görüşmelerimiz için topluluğumuza katılın",
            },
          ].map((social, index) => (
            <motion.div
              key={index}
              className="bg-gray-800 p-6 rounded-lg shadow-md text-center"
              whileHover={{ y: -10, boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-24 h-24 rounded-full bg-gray-700 mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">{social.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {social.name}
              </h3>
              <p className="text-gray-300 mb-4">{social.description}</p>
              <a
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-yellow-400 text-black font-bold py-2 px-4 rounded hover:bg-yellow-500 transition-colors"
              >
                Takip Et
              </a>
            </motion.div>
          ))}
        </div>
      </motion.div> */}
    </div>
  );
}
