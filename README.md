# Firebase ile Coin Mining Simülasyonu

Bu proje, cihaz kimlikleriyle kullanıcıların kayıt olmadan coin mining simülasyonu yapabildiği bir Next.js uygulamasıdır. LocalStorage yerine Firebase Firestore kullanarak daha güvenilir veri depolama ve gerçek zamanlı güncellemeler sağlar.

## Özellikler

- Kullanıcı kaydı/girişi gerektirmeden cihaz ID'si tabanlı kullanıcı takibi
- Firebase Firestore ile güvenilir veri depolama
- Cloud Functions ile arka planda otomatik bakiye güncellemeleri
- Kullanıcı inaktifse mining'i otomatik durdurma
- Gerçek zamanlı veri güncellemeleri (debug paneli dahil)

## Başlarken

1. Firebase'de bir proje oluşturun
2. Firebase yapılandırma bilgilerinizi `app/firebase.js` dosyasına ekleyin
3. Firebase CLI kurun: `npm install -g firebase-tools`
4. Firebase Functions'ı deploy edin:
   ```
   cd firebase-functions
   firebase deploy --only functions
   ```
5. Next.js uygulamasını başlatın:
   ```
   npm run dev
   ```

## Cloud Functions Nasıl Çalışır?

`updateMinerBalances` fonksiyonu, her 10 dakikada bir aşağıdaki işlemleri gerçekleştirir:

1. Aktif olarak mining yapan ve duraklatılmayan kullanıcıları bulur
2. Her kullanıcı için son güncelleme zamanından bu yana geçen periyot sayısını hesaplar
3. 12 saat inaktif olan kullanıcılar için mining'i duraklatır
4. Diğer kullanıcılar için geçen periyot sayısına göre bakiyelerini günceller

Bu sayede:

- Sayfa açık olmasa bile bakiyeler güncellenir
- Güvenilir zamanlama ve veri depolama sağlanır
- Artık LocalStorage ile ilgili sorunlar yaşanmaz

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

A 3-page website, about coins. pages will be
-home
-about us
-draw money

we will use framer for better transitions and animations, site will be basic and user friendly.

-In home page there should be a gif about "mining coins" and a wallet counter. The counter should start from 0 and go up for +100 dollars every 10 seconds.

In about us page there should be brief introduction about us, and contact info

In draw money page, there should be 3 different payment plan options; "3 months plan", "6 months plan" and "1 year plan"
