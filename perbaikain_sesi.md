Bro, **kalau timezone yang lo pakai adalah WIB/Jakarta**, jadwal di UI itu **hampir benar**, tapi labelnya perlu dirapihin biar nggak misleading.

## Penilaian cepat

Yang di UI lo:

```txt id="3d6dpv"
Sesi Asia: 07:00 - 14:00
Overlap Asia/Eropa: 14:00 - 16:00
Sesi Eropa: 16:00 - 19:00
Overlap Eropa/NY: 19:00 - 23:00
Sesi New York: 23:00 - 04:00
Off-Market/Lainnya: 04:00 - 07:00
```

**Ini valid kalau maksudnya adalah pembagian zona market state**, bukan jam full session.

Karena secara umum sesi utama forex adalah Tokyo/Asia, London/Eropa, dan New York. Tokyo umumnya sekitar **00:00–09:00 UTC**, London sekitar **07:00–16:00 UTC**, dan New York sekitar **12:00/13:00–21:00/22:00 UTC**, tergantung DST. ([Babypips.com][1])

Kalau dikonversi ke WIB saat periode DST/summer, kurang lebih:

| Session      | Full Session WIB |
| ------------ | ---------------: |
| Asia/Tokyo   |    07:00 - 16:00 |
| London/Eropa |    14:00 - 23:00 |
| New York     |    19:00 - 04:00 |

Nah UI lo sebenarnya memecah full session itu jadi **bagian non-overlap dan overlap**.

---

## Jadi yang benar begini

| Label UI Saat Ini                | Status                  | Catatan                                                  |
| -------------------------------- | ----------------------- | -------------------------------------------------------- |
| Sesi Asia 07:00 - 14:00          | Benar                   | Ini Asia-only sebelum London masuk                       |
| Overlap Asia/Eropa 14:00 - 16:00 | Benar                   | Asia masih aktif, London mulai aktif                     |
| Sesi Eropa 16:00 - 19:00         | Benar secara segmentasi | Tapi ini bukan full Eropa, ini Eropa-only                |
| Overlap Eropa/NY 19:00 - 23:00   | Benar                   | Ini biasanya window paling aktif untuk XAU               |
| Sesi New York 23:00 - 04:00      | Benar secara segmentasi | Tapi ini bukan full NY, ini NY-only setelah London tutup |
| Off-Market 04:00 - 07:00         | Cukup masuk akal        | Ini area sepi/transition sebelum Asia aktif              |

## Yang perlu diganti: labelnya

Supaya user nggak salah paham, gue saranin labelnya diubah jadi:

```txt id="9a05mn"
Asia Only (07:00 - 14:00)
Asia x Europe Overlap (14:00 - 16:00)
Europe Only (16:00 - 19:00)
Europe x New York Overlap (19:00 - 23:00)
New York Only (23:00 - 04:00)
Off / Low Liquidity (04:00 - 07:00)
```

Jadi bukan “Sesi Eropa” seolah-olah Eropa cuma 3 jam. Padahal full Eropa/London itu sekitar **14:00–23:00 WIB** pada summer/DST.

---

## Untuk XAUUSD, mana yang paling penting?

Kalau fokus lo XAUUSD M5, menurut gue ranking session-nya begini:

| Window        | Kualitas                                        |
| ------------- | ----------------------------------------------- |
| 19:00 - 23:00 | Paling aktif, tapi paling volatile              |
| 14:00 - 16:00 | Bagus untuk awal London, breakout sering muncul |
| 16:00 - 19:00 | Masih bagus, tapi bisa sideways sebelum NY      |
| 23:00 - 01:00 | Masih oke, follow-through NY                    |
| 01:00 - 04:00 | Mulai random/lebih tipis                        |
| 04:00 - 07:00 | Sebaiknya hindari untuk XAU scalping            |

---

## Catatan penting: DST

Jadwal ini harus punya mode:

```txt id="dxo7sm"
Summer/DST
Winter/Non-DST
```

Karena London dan New York bisa geser 1 jam. Tokyo relatif stabil karena Jepang tidak pakai daylight saving time. IG juga mencatat sesi Asia/Tokyo mengacu ke 09:00–18:00 JST. ([IG][2])

Versi winter/non-DST biasanya jadi kira-kira:

```txt id="8aay8x"
Asia Only: 07:00 - 15:00
Asia/Eropa Overlap: 15:00 - 16:00
Europe Only: 16:00 - 20:00
Europe/NY Overlap: 20:00 - 00:00
New York Only: 00:00 - 05:00
Off / Low Liquidity: 05:00 - 07:00
```

## Kesimpulan

**Jadwal di UI lo sudah oke untuk WIB mode summer/DST**, terutama kalau tujuannya buat filter market state XAUUSD.

Tapi gue saranin ganti label:

```txt id="5el3ty"
Sesi Asia → Asia Only
Sesi Eropa → Europe Only
Sesi New York → New York Only
```

Karena kalau ditulis “Sesi Eropa 16:00–19:00”, user bisa ngira sesi Eropa cuma 3 jam, padahal itu cuma bagian Eropa yang tidak overlap.

[1]: https://www.babypips.com/tools/forex-market-hours?utm_source=chatgpt.com "Forex Market Hours - Forex Market Time Converter"
[2]: https://www.ig.com/en-ch/learn-to-trade/ig-academy/a-look-at-forex-trading-strategies/trading-the-tokyo-session?utm_source=chatgpt.com "Trading the Tokyo session - IG"
