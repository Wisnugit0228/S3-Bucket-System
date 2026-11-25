import {
  deleteFile,
  downloadFile,
  uploadFile,
  getFileUrl,
  generateBackendSignedUrl,
  verifyBackendSignature,
} from "./Bucket.service.js";
import { PDFDocument, PDFName, StandardFonts, rgb } from "pdf-lib";

class FileService {
  constructor() {
    this.s3Upload = uploadFile;
    this.s3Delete = deleteFile;
    this.s3Download = downloadFile;
    this.s3GetFileUrl = getFileUrl;
    this.s3GenerateBackendSignedUrl = generateBackendSignedUrl;
    this.s3VerifyBackendSignature = verifyBackendSignature;
  }

  async uploadFile(bucketName, directory, file) {
    const uploadFile = await this.s3Upload(bucketName, directory, file);
    const { Location, Key, Bucket } = uploadFile;
    const keyFile = `${bucketName}/${Key}`;
    const localUrl = Location;
    const publicUrl = `${process.env.S3_PUBLIC_ENDPOINT}/${Bucket}/${Key}`;
    return {
      Key: keyFile,
      localUrl,
      publicUrl,
      Bucket,
    };
  }

  async deleteFile(key) {
    const deleteFile = await this.s3Delete(key);
    return deleteFile;
  }

  async downloadFile(key) {
    const downloadFile = await this.s3Download(key);
    return downloadFile;
  }

  async getFileUrl(key, bucketName = "", expiresIn = 3600) {
    const fileUrl = await this.s3GetFileUrl(key, bucketName, expiresIn);
    return fileUrl;
  }

  async getBackendFileUrl(key, bucketName = "", expiresIn = 3600, baseUrl = "") {
    const backendUrl = await this.s3GenerateBackendSignedUrl(
      key,
      bucketName,
      expiresIn,
      baseUrl
    );
    return backendUrl;
  }

  verifyFileSignature(key, expires, signature) {
    return this.s3VerifyBackendSignature(key, expires, signature);
  }

  /**
   * Menggabungkan banyak file PDF dari S3 berdasarkan array `keys` menjadi PDF Portfolio
   * @param {string[]} keys - Array key S3 (contoh: ["my-bucket/tte/doc1.pdf", "my-bucket/tte/doc2.pdf"])
   * @param {Object} options - Opsi tambahan { title, saveToS3, bucketName, directory, outputFileName }
   */

  wrapText(text, font, fontSize, maxWidth) {
    if (!text) return ["-"];
    const words = String(text).split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : ["-"];
  }

  async createPdfPortfolioFromKeys(keys, options = {}) {
    if (!Array.isArray(keys) || keys.length < 2) {
      throw new Error("Minimal dibutuhkan 2 key file PDF untuk digabungkan.");
    }

    const title = options.title || "BUNDEL DOKUMEN REKAM MEDIS ELEKTRONIK";
    const subtitle = options.subtitle || "RSUD Dr. H. MOHAMAD RABAIN MUARA ENIM";
    const subAddress =
      options.subAddress ||
      "Jl. Sultan Mahmud Badaruddin II No. 49 Muara Enim | Dokumen Tersertifikasi Elektronik (BSrE)";
    const outputFileName = options.outputFileName || `bundel-rme-${Date.now()}.pdf`;
    const includePreviewPages = options.includePreviewPages !== false;

    // Ambil data pasien dari options (payload body)
    const patient = options.patient || {};
    const noRm = patient.noRm || patient.no_rm || "-";
    const namaPasien = patient.nama || "-";
    const tanggalLahir = patient.tanggalLahir || patient.tanggal_lahir || "-";
    const umur = patient.umur || "-";
    const jenisKelamin = patient.jenisKelamin || patient.jenis_kelamin || "-";
    const alamat = patient.alamat || "-";

    // 1. Download semua file dari RustFS/S3 secara paralel
    const downloadedFiles = await Promise.all(
      keys.map(async (key, index) => {
        const s3Object = await this.downloadFile(key);
        const byteArray = await s3Object.Body.transformToByteArray();
        const rawName = key.split("/").pop() || `dokumen_${index + 1}.pdf`;

        return {
          key,
          fileName: rawName,
          buffer: Buffer.from(byteArray),
        };
      })
    );

    // 2. Buat Dokumen Induk & Embed Font
    const portfolioDoc = await PDFDocument.create();
    const fontBold = await portfolioDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await portfolioDoc.embedFont(StandardFonts.Helvetica);

    const pageWidth = 595.28; // A4 Portrait
    const pageHeight = 841.89;
    const margin = 45;
    const contentWidth = pageWidth - margin * 2;

    const coverPage = portfolioDoc.addPage([pageWidth, pageHeight]);

    // --- BANNER HEADER UTAMA ---
    coverPage.drawRectangle({
      x: 0,
      y: pageHeight - 115,
      width: pageWidth,
      height: 115,
      color: rgb(0.07, 0.22, 0.42),
    });

    coverPage.drawRectangle({
      x: 0,
      y: pageHeight - 120,
      width: pageWidth,
      height: 5,
      color: rgb(0.12, 0.58, 0.55),
    });

    coverPage.drawText(subtitle.toUpperCase(), {
      x: margin,
      y: pageHeight - 42,
      size: 11,
      font: fontBold,
      color: rgb(0.75, 0.88, 0.98),
    });

    coverPage.drawText(title.toUpperCase(), {
      x: margin,
      y: pageHeight - 68,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    coverPage.drawText(subAddress, {
      x: margin,
      y: pageHeight - 92,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.88, 0.92, 0.96),
    });

    // --- KARTU INFORMASI BUNDEL & DATA PASIEN ---
    const generatedAt = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "long",
      timeStyle: "short",
    });

    // Hitung tinggi dinamis kartu berdasarkan jumlah baris alamat
    const labelX = margin + 18;
    const colonX = margin + 150;
    const valueX = margin + 162;
    const maxAlamatWidth = contentWidth - 178;
    const alamatLines = this.wrapText(alamat, fontRegular, 10, maxAlamatWidth);

    const rows = [
      { label: "Tanggal Penggabungan", value: `${generatedAt} WIB`, isBoldValue: false },
      {
        label: "Total Dokumen",
        value: `${downloadedFiles.length} Berkas TTE (Validasi Kriptografi Terlampir di Metadata PDF)`,
        isBoldValue: false,
      },
      { isDivider: true },
      { label: "No. Rekam Medis", value: String(noRm), isBoldValue: true },
      { label: "Nama Pasien", value: String(namaPasien).toUpperCase(), isBoldValue: true },
      { label: "Tanggal Lahir", value: String(tanggalLahir), isBoldValue: false },
      { label: "Umur", value: String(umur), isBoldValue: false },
      { label: "Jenis Kelamin", value: String(jenisKelamin), isBoldValue: false },
      { label: "Alamat", valueLines: alamatLines, isBoldValue: false },
    ];

    const headerBarHeight = 30;
    const rowSpacing = 24;
    const extraAlamatHeight = (alamatLines.length - 1) * 15;
    const cardBodyHeight = rows.length * rowSpacing + extraAlamatHeight + 16;
    const cardTop = pageHeight - 148;

    // Background & Border Kartu
    coverPage.drawRectangle({
      x: margin,
      y: cardTop - headerBarHeight - cardBodyHeight,
      width: contentWidth,
      height: headerBarHeight + cardBodyHeight,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.82, 0.86, 0.91),
      borderWidth: 1,
    });

    // Header Bar Kartu
    coverPage.drawRectangle({
      x: margin,
      y: cardTop - headerBarHeight,
      width: contentWidth,
      height: headerBarHeight,
      color: rgb(0.13, 0.31, 0.53),
    });

    coverPage.drawText("INFORMASI DOKUMEN & IDENTITAS PASIEN", {
      x: labelX,
      y: cardTop - 20,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Render setiap baris di dalam kartu
    let currentY = cardTop - headerBarHeight - 22;

    for (const row of rows) {
      if (row.isDivider) {
        coverPage.drawLine({
          start: { x: labelX, y: currentY + 7 },
          end: { x: margin + contentWidth - 18, y: currentY + 7 },
          thickness: 0.8,
          color: rgb(0.83, 0.87, 0.92),
        });
        currentY -= 16;
        continue;
      }

      // Label kolom kiri
      coverPage.drawText(row.label, {
        x: labelX,
        y: currentY,
        size: 10,
        font: fontBold,
        color: rgb(0.22, 0.27, 0.35),
      });

      // Tanda titik dua (:)
      coverPage.drawText(":", {
        x: colonX,
        y: currentY,
        size: 10,
        font: fontBold,
        color: rgb(0.22, 0.27, 0.35),
      });

      // Nilai kolom kanan (multi-line untuk alamat, single-line untuk lainnya)
      if (row.valueLines) {
        row.valueLines.forEach((line, idx) => {
          coverPage.drawText(line, {
            x: valueX,
            y: currentY - idx * 15,
            size: 10,
            font: fontRegular,
            color: rgb(0.1, 0.14, 0.2),
          });
        });
        currentY -= rowSpacing + (row.valueLines.length - 1) * 15;
      } else {
        coverPage.drawText(row.value, {
          x: valueX,
          y: currentY,
          size: 10,
          font: row.isBoldValue ? fontBold : fontRegular,
          color: rgb(0.1, 0.14, 0.2),
        });
        currentY -= rowSpacing;
      }
    }

    // --- FOOTER KETERANGAN KEASLIAN TTE ---
    coverPage.drawLine({
      start: { x: margin, y: 72 },
      end: { x: margin + contentWidth, y: 72 },
      thickness: 0.8,
      color: rgb(0.8, 0.84, 0.88),
    });

    coverPage.drawText("INFORMASI VALIDASI TANDA TANGAN ELEKTRONIK (TTE):", {
      x: margin,
      y: 58,
      size: 8.5,
      font: fontBold,
      color: rgb(0.15, 0.2, 0.28),
    });

    coverPage.drawText(
      "Halaman berikutnya adalah salinan cetak untuk pratinjau/pencetakan langsung. Berkas asli yang ditandatangani secara elektronik",
      {
        x: margin,
        y: 46,
        size: 8,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.46),
      }
    );

    coverPage.drawText(
      "tersimpan utuh di dalam lampiran (Attachments/Portfolio) dokumen ini dan dapat diverifikasi melalui Adobe Acrobat Reader / BSrE.",
      {
        x: margin,
        y: 35,
        size: 8,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.46),
      }
    );

    // 3. Attach File Asli (TTE tetap valid) & Salin Halaman Visual untuk Print Browser
    const usedNames = new Set();

    for (let i = 0; i < downloadedFiles.length; i++) {
      const item = downloadedFiles[i];

      let attachName = item.fileName;
      if (usedNames.has(attachName)) {
        attachName = `${i + 1}_${item.fileName}`;
      }
      usedNames.add(attachName);

      // Attach buffer mentah ke PDF Portfolio
      await portfolioDoc.attach(item.buffer, attachName, {
        mimeType: "application/pdf",
        description: `Dokumen TTE #${i + 1}: ${attachName}`,
        creationDate: new Date(),
        modificationDate: new Date(),
      });

      // Salin halaman visual ke PDF utama
      if (includePreviewPages) {
        const srcDoc = await PDFDocument.load(item.buffer, {
          ignoreEncryption: true,
        });
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await portfolioDoc.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((copiedPage) => {
          portfolioDoc.addPage(copiedPage);
        });
      }
    }

    // 4. Konfigurasi Catalog PDF Portfolio
    const catalog = portfolioDoc.catalog;
    catalog.set(PDFName.of("PageMode"), PDFName.of("UseAttachments"));
    catalog.set(
      PDFName.of("Collection"),
      portfolioDoc.context.obj({
        View: PDFName.of("D"),
      })
    );

    const pdfBytes = await portfolioDoc.save();
    const portfolioBuffer = Buffer.from(pdfBytes);

    // 5. Simpan ke RustFS/S3 jika saveToS3 = true
    if (options.saveToS3) {
      if (!options.bucketName || !options.directory) {
        throw new Error("bucketName dan directory wajib diisi jika saveToS3 = true.");
      }

      const uploaded = await this.uploadFile(options.bucketName, options.directory, {
        originalname: outputFileName,
        buffer: portfolioBuffer,
        mimetype: "application/pdf",
      });

      return {
        saved: true,
        fileName: outputFileName,
        totalPages: portfolioDoc.getPageCount(),
        ...uploaded,
      };
    }

    return {
      saved: false,
      fileName: outputFileName,
      totalPages: portfolioDoc.getPageCount(),
      buffer: portfolioBuffer,
    };
  }

}

export default new FileService();