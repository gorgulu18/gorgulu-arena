# GÖRGÜLÜ ARENA Firebase kurulumu

Bu aşama herkesin aynı aile koduyla ortak oyları ve günlük cümleleri görmesini sağlar.

## 1. Firebase projesi oluştur

1. `console.firebase.google.com` adresine gir.
2. `Create a project` seç.
3. Proje adı: `gorgulu-arena`
4. Google Analytics sorarsa kapatabilirsin.
5. Projeyi oluştur.

## 2. Web app ekle

1. Proje ana ekranında `</>` web ikonuna bas.
2. App nickname: `gorgulu-arena-web`
3. Firebase Hosting seçeneğini işaretlemene gerek yok.
4. `Register app` de.
5. Sana `firebaseConfig` kodu verecek.

## 3. Config'i uygulamaya koy

GitHub'da `firebase-config.js` dosyasını aç.

Şu placeholder değerleri Firebase'in verdiği değerlerle değiştir:

```js
window.GORGULU_FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Değişiklikten sonra `Commit changes` de.

## 4. Anonymous Auth aç

1. Firebase sol menüden `Authentication` seç.
2. `Get started` de.
3. `Sign-in method` sekmesine gir.
4. `Anonymous` seç.
5. Enable yap ve kaydet.

## 5. Firestore aç

1. Firebase sol menüden `Firestore Database` seç.
2. `Create database` de.
3. Başlangıç için production mode seçebilirsin.
4. Lokasyon olarak Avrupa yakın bir yer seç.

## 6. Firestore Rules ekle

Firestore `Rules` sekmesine gir.

`firestore.rules` dosyasındaki kuralları kopyala ve Firebase Rules alanına yapıştır.

Sonra `Publish` de.

## 7. Test

1. Vercel deploy bitince uygulamayı aç.
2. Üstteki `Kurulum` veya `Yerel` butonuna bas.
3. Aile kodu gir: `GORGULU-4821`
4. Kodu kaydet.
5. Başka telefonda aynı kodu gir.

Artık oylar ve günlük cümleler ortak görünmeli.
