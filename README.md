# Petualangan Sejarah Nusantara
**Misi Melawan Penjajahan Belanda** — game edukasi interaktif kelas VI SD.

## Fitur
- Lima level dan 15 soal sesuai bank soal yang diberikan.
- Mode petualangan individu dan tantangan kelas dua tim.
- Pilihan jawaban berbentuk lebah, skor, umpan balik, peta progres, lencana, dan piagam cetak.
- Pelacakan ujung jari telunjuk (landmark 8) secara real-time dengan MediaPipe Hand Landmarker.
- Pemilihan jawaban dengan dwell/menahan telunjuk pada area lebah.
- Mode latihan tanpa kamera untuk uji alur permainan.
- Panel diagnostik guru dan pengaturan durasi/sensitivitas.
- Video diproses di browser; tidak diunggah atau direkam.

## Menjalankan secara lokal
Persyaratan: Node.js 18+ dan browser modern.

```bash
npm install
npm run dev
```
Buka alamat lokal yang ditampilkan Vite. Untuk akses kamera di perangkat selain localhost, gunakan HTTPS. Berikan izin kamera saat diminta.

Build produksi:
```bash
npm run build
npm run preview
```

## Cara menggunakan kamera
1. Buka game di browser dengan akses kamera.
2. Pilih mode individu atau tantangan kelas.
3. Aktifkan kamera di halaman petunjuk.
4. Tunggu status sensor siap, lalu mulai.
5. Tunjukkan tangan ke kamera dan arahkan ujung telunjuk ke salah satu kartu lebah.
6. Tahan sampai progres lingkaran penuh untuk memilih jawaban.

MediaPipe WASM dan model Hand Landmarker dimuat dari CDN saat kamera diaktifkan; koneksi internet diperlukan saat pemuatan awal. Jika perangkat tidak mendukung kamera atau izin ditolak, gunakan mode latihan tanpa kamera untuk memeriksa alur soal.

## Catatan implementasi
- Kamera diminta melalui `getUserMedia`; pemrosesan landmark berjalan lokal menggunakan `requestAnimationFrame` dan `detectForVideo`.
- Video dicerminkan untuk pratinjau; koordinat telunjuk disesuaikan terhadap tampilan tersebut.
- Audio menggunakan Web Audio API tanpa file audio eksternal.
- Soal dan urutan opsi diacak setiap permainan, sementara pasangan kunci dan penjelasan tetap terjaga.
- Sertifikat menggunakan dialog cetak browser (pilih "Save as PDF" bila ingin menyimpan PDF).

## Batasan pengujian
Kode sumber telah ditambahkan ke repositori. Kamera dan deteksi tangan perlu diuji pada perangkat fisik dengan webcam dan browser yang mendukung WebAssembly/WebGL. Hasil kompilasi belum dapat dinyatakan lulus sebelum `npm install` dan `npm run build` dijalankan pada lingkungan Node.js.


## Publikasi online (GitHub Pages)

Workflow GitHub Actions membangun dan menerbitkan aplikasi secara otomatis setiap ada push ke branch `main`.

- URL game: https://apluscourse-maksimalkanprestasimu.github.io/petualangan-sejarah-nusantara/
- Status deployment: tab **Actions** pada repositori.
- Setelah commit pertama workflow selesai, buka URL game di atas. Publikasi pertama mungkin memerlukan beberapa menit.
- Pull request menjalankan pemeriksaan build, tetapi tidak menerbitkan situs.
- Kamera membutuhkan HTTPS dan izin kamera dari browser. Pemrosesan gambar dilakukan lokal di perangkat.

Jika deployment gagal karena Pages belum diaktifkan, buka **Settings → Pages**, pilih **GitHub Actions** pada bagian Build and deployment, lalu jalankan ulang workflow.
