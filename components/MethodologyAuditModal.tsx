'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Download,
  Table,
  Calculator,
  Compass,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';
import { AhpResult, TopsisSummary } from '@/lib/types';

interface MethodologyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  ahpResult: AhpResult;
  topsisResult: TopsisSummary;
}

export const MethodologyAuditModal: React.FC<MethodologyAuditModalProps> = ({
  isOpen,
  onClose,
  ahpResult,
  topsisResult,
}) => {
  const [activeTab, setActiveTab] = useState<'ahp' | 'topsis' | 'export'>('ahp');

  if (!isOpen) return null;

  // CSV Exporter
  const handleExportCsv = () => {
    const headers = [
      'Peringkat (Rank)',
      'ID Grid',
      'Kecamatan',
      'Latitude',
      'Longitude',
      'Status Kelayakan Lahan',
      'Alasan Restriksi',
      'C1 Jarak Kompetitor (m)',
      'C2 Populasi (jiwa)',
      'C3 Jarak Jalan (m)',
      'C4 Jarak Keramaian (m)',
      'Jarak Ideal Positif (S+)',
      'Jarak Ideal Negatif (S-)',
      'Skor Preferensi (Vi)',
      'Kategori Kelayakan',
    ];

    const rows = topsisResult.candidates.map((c) => [
      c.rank,
      c.id,
      c.district,
      c.lat,
      c.lng,
      c.isRestricted ? 'Zona Terlarang' : 'Kawasan Layak Usaha',
      c.restrictionReason || '-',
      c.c1_dist_competitor,
      c.c2_population,
      c.c3_dist_road,
      c.c4_dist_crowd,
      c.dPlus.toFixed(5),
      c.dMinus.toFixed(5),
      c.score.toFixed(5),
      c.category,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `hasil_analisis_ahp_topsis_bogor_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Transparansi &amp; Audit Metodologi (Skripsi)
              </h2>
              <p className="text-xs text-slate-400">
                Verifikasi rumus komputasi matematis Analytic Hierarchy Process, TOPSIS, &amp; Constraint Masking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('ahp')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'ahp'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Matriks &amp; Konsistensi AHP
          </button>
          <button
            onClick={() => setActiveTab('topsis')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'topsis'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Tahapan Komputasi TOPSIS &amp; Restriksi Lahan
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 border-b-2 transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. Ekspor Data Analisis
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* TAB 1: AHP */}
          {activeTab === 'ahp' && (
            <div className="space-y-5">
              {/* Formula Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Rumus Perhitungan AHP (Thomas L. Saaty):
                </span>
                <div className="text-slate-300 leading-relaxed text-[11px] space-y-1">
                  <p>1. <strong>Bobot Prioritas (w_i):</strong> Rata-rata baris dari matriks perbandingan berpasangan yang telah dinormalisasi kolom.</p>
                  <p>2. <strong>Nilai Eigen Maksimum (&lambda;_max):</strong> &lambda;_max = (1/n) &Sigma; ((A &middot; W)_i / w_i).</p>
                  <p>3. <strong>Index Konsistensi (CI):</strong> CI = (&lambda;_max - n) / (n - 1). Untuk n = 4, CI = (&lambda;_max - 4) / 3.</p>
                  <p>4. <strong>Rasio Konsistensi (CR):</strong> CR = CI / RI dengan RI (n=4) = 0.90. Syarat konsistensi: CR &le; 0.10 (10%).</p>
                </div>
              </div>

              {/* Matriks Perbandingan Berpasangan A */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">A. Matriks Perbandingan Berpasangan (A)</h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Kriteria</th>
                        <th className="p-2.5">C1 (Jarak Kopi)</th>
                        <th className="p-2.5">C2 (Populasi)</th>
                        <th className="p-2.5">C3 (Akses Jalan)</th>
                        <th className="p-2.5">C4 (Keramaian)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {ahpResult.rawMatrix.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-800/50">
                          <td className="p-2.5 font-sans font-semibold text-emerald-400">
                            {['C1', 'C2', 'C3', 'C4'][i]}
                          </td>
                          {row.map((val, j) => (
                            <td key={j} className="p-2.5">
                              {val.toFixed(3)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Matriks Ternormalisasi & Bobot W */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">
                  B. Matriks Ternormalisasi &amp; Vektor Bobot (W)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-2.5">Kriteria</th>
                        <th className="p-2.5">C1</th>
                        <th className="p-2.5">C2</th>
                        <th className="p-2.5">C3</th>
                        <th className="p-2.5">C4</th>
                        <th className="p-2.5 bg-emerald-950/40 text-emerald-300 font-bold">
                          Bobot (w_i)
                        </th>
                        <th className="p-2.5 bg-emerald-950/40 text-emerald-300 font-bold">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {ahpResult.normalizedMatrix.map((row, i) => {
                        const weight = ahpResult.weightsArray[i];
                        return (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="p-2.5 font-sans font-semibold text-emerald-400">
                              {['C1', 'C2', 'C3', 'C4'][i]}
                            </td>
                            {row.map((val, j) => (
                              <td key={j} className="p-2.5">
                                {val.toFixed(4)}
                              </td>
                            ))}
                            <td className="p-2.5 bg-emerald-950/20 font-bold text-white">
                              {weight.toFixed(4)}
                            </td>
                            <td className="p-2.5 bg-emerald-950/20 font-bold text-emerald-400 font-sans">
                              {(weight * 100).toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hasil Validasi CR */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Eigenvalue (&lambda;_max)</span>
                  <span className="text-sm font-bold text-cyan-400">{ahpResult.lambdaMax.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Consistency Index (CI)</span>
                  <span className="text-sm font-bold text-amber-400">{ahpResult.ci.toFixed(5)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Consistency Ratio (CR)</span>
                  <span
                    className={`text-sm font-black ${
                      ahpResult.isConsistent ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(ahpResult.cr * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOPSIS & CONSTRAINT MASKING */}
          {activeTab === 'topsis' && (
            <div className="space-y-5">
              {/* Formula TOPSIS */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Tahapan Komputasi TOPSIS (Hwang &amp; Yoon):
                </span>
                <div className="text-slate-300 leading-relaxed text-[11px] space-y-1">
                  <p>1. <strong>Normalisasi Vektor (r_ij):</strong> r_ij = x_ij / &radic;(&Sigma; x_kj&sup2;).</p>
                  <p>2. <strong>Matriks Ternormalisasi Terbobot (y_ij):</strong> y_ij = w_j &middot; r_ij.</p>
                  <p>3. <strong>Solusi Ideal Positif (A&sdot;) &amp; Negatif (A&#8315;):</strong> Benefit (C1, C2) &rarr; A&sdot; = max(y_ij), A&#8315; = min(y_ij). Cost (C3, C4) &rarr; A&sdot; = min(y_ij), A&#8315; = max(y_ij).</p>
                  <p>4. <strong>Jarak Euclidean:</strong> S_i&sdot; = &radic;(&Sigma; (y_ij - y_j&sdot;)&sup2;) dan S_i&#8315; = &radic;(&Sigma; (y_ij - y_j&#8315;)&sup2;).</p>
                  <p>5. <strong>Nilai Preferensi (V_i):</strong> V_i = S_i&#8315; / (S_i&sdot; + S_i&#8315;), dimana V_i &isin; [0, 1].</p>
                </div>
              </div>

              {/* Spatial Constraint Explanation Card */}
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/60 space-y-2">
                <span className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Penanganan Lahan Terlarang (*Spatial Constraint Masking*):
                </span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Pada evaluasi spasial multikriteria (*Spatial Multi-Criteria Evaluation / SMCE*), titik kandidat yang jatuh pada <strong>Zona Restriksi (TPU / Pemakaman Umum, Markas Kepolisian &amp; Militer, Ring 1 Istana, Sempadan Sungai)</strong> dikalikan dengan variabel Boolean $C_k = 0$ sehingga dieliminasi dari rekomendasi bisnis:
                  <br />
                  <span className="font-mono text-amber-300 block mt-1 font-bold">
                    Skor Kelayakan Final = V_i &times; &prod; C_k, dimana C_k &isin; &#123;0, 1&#125;
                  </span>
                </p>
              </div>

              {/* Solusi Ideal Table */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">
                  A. Solusi Ideal Positif (A&sdot;) &amp; Solusi Ideal Negatif (A&#8315;)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[11px]">
                      <tr>
                        <th className="p-2.5 font-sans">Solusi Ideal</th>
                        <th className="p-2.5">C1 (Benefit)</th>
                        <th className="p-2.5">C2 (Benefit)</th>
                        <th className="p-2.5">C3 (Cost)</th>
                        <th className="p-2.5">C4 (Cost)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr className="bg-emerald-950/20">
                        <td className="p-2.5 font-sans font-bold text-emerald-400">
                          A&sdot; (Ideal Positif)
                        </td>
                        <td className="p-2.5">{topsisResult.idealPositive[0].toFixed(5)}</td>
                        <td className="p-2.5">{topsisResult.idealPositive[1].toFixed(5)}</td>
                        <td className="p-2.5">{topsisResult.idealPositive[2].toFixed(5)}</td>
                        <td className="p-2.5">{topsisResult.idealPositive[3].toFixed(5)}</td>
                      </tr>
                      <tr className="bg-rose-950/20">
                        <td className="p-2.5 font-sans font-bold text-rose-400">
                          A&#8315; (Ideal Negatif)
                        </td>
                        <td className="p-2.5">{topsisResult.idealNegative[0].toFixed(5)}</td>
                        <td className="p-2.5">{topsisResult.idealNegative[1].toFixed(5)}</td>
                        <td className="p-2.5">{topsisResult.idealNegative[2].toFixed(5)}</td>
                        <td className="p-2.5">{topsisResult.idealNegative[3].toFixed(5)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cuplikan Sampel Alternatif Top 5 */}
              <div>
                <h4 className="font-bold text-slate-200 mb-2">
                  B. Matriks Keputusan &amp; Nilai Preferensi (V_i) Top 5 (Layak Usaha)
                </h4>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2 font-sans">Rank</th>
                        <th className="p-2 font-sans">Kecamatan</th>
                        <th className="p-2">C1 (m)</th>
                        <th className="p-2">C2 (jiwa)</th>
                        <th className="p-2">C3 (m)</th>
                        <th className="p-2">C4 (m)</th>
                        <th className="p-2 text-cyan-300">S&sdot;</th>
                        <th className="p-2 text-amber-300">S&#8315;</th>
                        <th className="p-2 font-bold text-emerald-400">Vi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {topsisResult.candidates.filter(c => !c.isRestricted).slice(0, 5).map((c, idx) => (
                        <tr key={c.id} className="hover:bg-slate-800/50">
                          <td className="p-2 font-sans font-bold text-white">#{idx + 1}</td>
                          <td className="p-2 font-sans text-slate-300">{c.district}</td>
                          <td className="p-2">{Math.round(c.c1_dist_competitor)}</td>
                          <td className="p-2">{c.c2_population.toLocaleString('id-ID')}</td>
                          <td className="p-2">{Math.round(c.c3_dist_road)}</td>
                          <td className="p-2">{Math.round(c.c4_dist_crowd)}</td>
                          <td className="p-2 text-cyan-400">{c.dPlus.toFixed(4)}</td>
                          <td className="p-2 text-amber-400">{c.dMinus.toFixed(4)}</td>
                          <td className="p-2 font-bold text-emerald-400">{c.score.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* C. Representasi Keruangan: Centroid Grid & Buffer Catchment Area */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-400" /> C. Justifikasi Akademik: Representasi Titik Centroid vs Zona Radius Potensi
                </h4>
                <div className="text-slate-300 leading-relaxed text-[11px] space-y-1.5">
                  <p>
                    1. <strong>Sifat Grid Sampling (Centroid Representatif):</strong> Titik koordinat yang dihasilkan dari perhitungan matematis TOPSIS merupakan <em>Centroid</em> (titik pusat representatif) dari suatu sel spasial seluas ~400&ndash;500 meter persegi, bukan batasan kapling tanah privat mikro.
                  </p>
                  <p>
                    2. <strong>Konsep Catchment Area / Trade Area (Huff &amp; Reilly):</strong> Dalam bisnis ritel dan kedai kopi, pasar tidak berpusat pada satu titik absolut melainkan koridor jangkauan pejalan kaki (*walkable trade area*) dalam radius 150&ndash;300 meter (~5 menit jalan kaki).
                  </p>
                  <p>
                    3. <strong>Fleksibilitas Ketersediaan Properti Lapangan:</strong> Penyajian dalam bentuk <em>Buffer Radius</em> mengedukasi calon pengusaha untuk mencari properti sewa/ruko yang tersedia di dalam lingkar radius potensi tersebut, sehingga menghindari asumsi bahwa bisnis harus berada persis di atas koordinat titik numerik.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ekspor Dataset Lengkap Hasil TOPSIS</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Unduh file CSV yang memuat seluruh {topsisResult.candidates.length} titik koordinat sampling, status kelayakan lahan, nilai kriteria C1 - C4, jarak Euclidean S&sdot;, S&#8315;, dan skor preferensi V_i untuk lampiran bab 4 skripsi.
                  </p>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Unduh File CSV (.csv)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <span>Metode: Integrasi AHP (Saaty 1980), TOPSIS (Hwang &amp; Yoon 1981), &amp; Boolean Constraint SMCE</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
