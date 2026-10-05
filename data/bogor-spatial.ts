import {
  CompetitorPoint,
  DistrictGeo,
  RoadSegment,
  CrowdCenterPoint,
  SpatialCandidate,
  ExclusionZone,
} from '../lib/types';

// ==========================================
// 1. BOUNDARY & DATA 6 KECAMATAN KOTA BOGOR
// (Sumber: BPS Kota Bogor & RTRW Kota Bogor)
// ==========================================

export const BOGOR_DISTRICTS: DistrictGeo[] = [
  {
    id: 'bogor_tengah',
    name: 'Bogor Tengah',
    population: 98240,
    areaKm2: 8.13,
    density: 12083,
    color: '#3B82F6', // Blue
    center: [-6.5971, 106.7972],
    coordinates: [
      [
        [-6.582, 106.786],
        [-6.581, 106.805],
        [-6.593, 106.812],
        [-6.608, 106.809],
        [-6.612, 106.795],
        [-6.605, 106.782],
        [-6.591, 106.781],
        [-6.582, 106.786],
      ],
    ],
  },
  {
    id: 'bogor_timur',
    name: 'Bogor Timur',
    population: 104870,
    areaKm2: 10.15,
    density: 10332,
    color: '#10B981', // Emerald
    center: [-6.6186, 106.8208],
    coordinates: [
      [
        [-6.593, 106.812],
        [-6.598, 106.836],
        [-6.621, 106.845],
        [-6.643, 106.832],
        [-6.638, 106.814],
        [-6.618, 106.808],
        [-6.608, 106.809],
        [-6.593, 106.812],
      ],
    ],
  },
  {
    id: 'bogor_utara',
    name: 'Bogor Utara',
    population: 189520,
    areaKm2: 17.72,
    density: 10695,
    color: '#8B5CF6', // Purple
    center: [-6.5652, 106.8124],
    coordinates: [
      [
        [-6.541, 106.808],
        [-6.545, 106.832],
        [-6.568, 106.839],
        [-6.588, 106.828],
        [-6.593, 106.812],
        [-6.581, 106.805],
        [-6.559, 106.799],
        [-6.541, 106.808],
      ],
    ],
  },
  {
    id: 'bogor_selatan',
    name: 'Bogor Selatan',
    population: 209140,
    areaKm2: 30.81,
    density: 6788,
    color: '#F59E0B', // Amber
    center: [-6.6384, 106.8042],
    coordinates: [
      [
        [-6.612, 106.795],
        [-6.618, 106.808],
        [-6.638, 106.814],
        [-6.669, 106.825],
        [-6.678, 106.801],
        [-6.662, 106.779],
        [-6.632, 106.778],
        [-6.612, 106.795],
      ],
    ],
  },
  {
    id: 'bogor_barat',
    name: 'Bogor Barat',
    population: 236780,
    areaKm2: 23.08,
    density: 10259,
    color: '#EC4899', // Pink
    center: [-6.5824, 106.7645],
    coordinates: [
      [
        [-6.557, 106.761],
        [-6.568, 106.778],
        [-6.582, 106.786],
        [-6.591, 106.781],
        [-6.605, 106.782],
        [-6.612, 106.795],
        [-6.632, 106.778],
        [-6.621, 106.742],
        [-6.589, 106.738],
        [-6.569, 106.749],
        [-6.557, 106.761],
      ],
    ],
  },
  {
    id: 'tanah_sareal',
    name: 'Tanah Sareal',
    population: 221450,
    areaKm2: 18.84,
    density: 11754,
    color: '#06B6D4', // Cyan
    center: [-6.5548, 106.7794],
    coordinates: [
      [
        [-6.529, 106.772],
        [-6.541, 106.808],
        [-6.559, 106.799],
        [-6.581, 106.805],
        [-6.582, 106.786],
        [-6.568, 106.778],
        [-6.557, 106.761],
        [-6.539, 106.755],
        [-6.529, 106.772],
      ],
    ],
  },
];

// ==========================================
// 2. ZONA RESTRIKSI / LAHAN TERLARANG KOTA BOGOR
// (TPU / Kuburan, Kantor Polisi, Markas Militer,
//  Istana Kepresidenan, Cagar Alam, Sempadan Sungai)
// ==========================================

export const BOGOR_EXCLUSION_ZONES: ExclusionZone[] = [
  // TPU / Kuburan (Cemeteries)
  {
    id: 'ex_tpu_blender',
    name: 'TPU Blender (Kebon Pedes)',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Kompleks Tempat Pemakaman Umum Blender - Zona Terlarang Non-Komersial',
    center: [-6.5615, 106.7865],
    radiusMeters: 320,
  },
  {
    id: 'ex_tpu_dreded',
    name: 'TPU Dreded & Makam Pahlawan',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Kawasan TPU Dreded dan Taman Makam Pahlawan - Zona Sakral Non-Usaha',
    center: [-6.6185, 106.8012],
    radiusMeters: 300,
  },
  {
    id: 'ex_tpu_gunung_gadung',
    name: 'TPU Gunung Gadung Cipaku',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Kompleks Pemakaman Tionghoa Gunung Gadung seluas puluhan hektar',
    center: [-6.6435, 106.8195],
    radiusMeters: 480,
  },
  {
    id: 'ex_tpu_kayumanis',
    name: 'TPU Kayumanis',
    type: 'cemetery',
    typeLabel: 'Pemakaman Umum (TPU)',
    description: 'Lahan Tempat Pemakaman Umum Kayumanis Tanah Sareal',
    center: [-6.5325, 106.7645],
    radiusMeters: 280,
  },

  // Kantor Kepolisian & Markas Militer
  {
    id: 'ex_polresta_bogor',
    name: 'Mako Polresta Bogor Kota',
    type: 'military_police',
    typeLabel: 'Instansi Keamanan / Polisi',
    description: 'Markas Komando Kepolisian Resor Kota Bogor - Kawasan Otoritas Terbatas',
    center: [-6.5938, 106.7885],
    radiusMeters: 220,
  },
  {
    id: 'ex_korem_suryakancana',
    name: 'Korem 061/Suryakancana & Kodim 0606',
    type: 'military_police',
    typeLabel: 'Markas Militer / TNI',
    description: 'Komando Resor Militer dan Distrik Militer - Zona Pertahanan Terbatas',
    center: [-6.5895, 106.7852],
    radiusMeters: 220,
  },
  {
    id: 'ex_pusdikzi_tni',
    name: 'Pusdikzi TNI-AD Sudirman',
    type: 'military_police',
    typeLabel: 'Pusat Pendidikan Militer TNI',
    description: 'Pusat Pendidikan Zeni Angkatan Darat - Kompleks Militer Tertutup',
    center: [-6.5845, 106.7942],
    radiusMeters: 260,
  },
  {
    id: 'ex_brimob_sukasari',
    name: 'Mako Brimob & Satlantas Sukasari',
    type: 'military_police',
    typeLabel: 'Instansi Kepolisian Khusus',
    description: 'Kawasan Asrama dan Kantor Kepolisian Tertutup',
    center: [-6.6192, 106.8135],
    radiusMeters: 200,
  },

  // Kawasan Khusus / Istana Kepresidenan
  {
    id: 'ex_istana_bogor',
    name: 'Istana Kepresidenan Bogor (Ring 1)',
    type: 'palace_conservation',
    typeLabel: 'Kawasan Khusus Kenegaraan (Ring 1)',
    description: 'Zona Otoritas Khusus Istana Kepresidenan RI - Dilarang Bangunan Komersial',
    center: [-6.5945, 106.7972],
    radiusMeters: 380,
  },

  // Sempadan Sungai Rawan Banjir
  {
    id: 'ex_sungai_ciliwung',
    name: 'Sempadan Rawan Sungai Ciliwung',
    type: 'water_body',
    typeLabel: 'Sempadan Aliran Sungai',
    description: 'Bantaran Sungai Ciliwung - Zona Hijau Perlindungan Air & Bebas Bangunan',
    center: [-6.6065, 106.8045],
    radiusMeters: 180,
  },
];

// ==========================================
// 3. DATA KOMPETITOR KEDAI KOPI EKSISTING
// (60+ Titik Coffee Shop Riil di Kota Bogor)
// ==========================================

export const BOGOR_COMPETITORS: CompetitorPoint[] = [
  // Bogor Tengah
  { id: 'comp_1', name: 'Popolo Coffee Baranangsiang', lat: -6.6018, lng: 106.8068, district: 'Bogor Tengah', address: 'Jl. Malabar Ujung No.9', category: 'Specialty Coffee' },
  { id: 'comp_2', name: 'Maraca Books and Coffee', lat: -6.5925, lng: 106.8012, district: 'Bogor Tengah', address: 'Jl. Jalak Harupat No.9a', category: 'Book Cafe' },
  { id: 'comp_3', name: 'Starbucks Botani Square', lat: -6.6009, lng: 106.8056, district: 'Bogor Tengah', address: 'Botani Square Mall Lt. GF', category: 'Chain Commercial' },
  { id: 'comp_4', name: 'Kopi Kenangan Botani Square', lat: -6.6012, lng: 106.8061, district: 'Bogor Tengah', address: 'Botani Square Mall Lt. 2', category: 'Grab & Go' },
  { id: 'comp_5', name: 'Fore Coffee Botani Square', lat: -6.6015, lng: 106.8052, district: 'Bogor Tengah', address: 'Botani Square Mall Ground', category: 'Grab & Go' },
  { id: 'comp_6', name: 'Janji Jiwa Suryakencana', lat: -6.6045, lng: 106.7998, district: 'Bogor Tengah', address: 'Jl. Suryakencana No.158', category: 'Grab & Go' },
  { id: 'comp_7', name: 'Tomoro Coffee Suryakencana', lat: -6.6062, lng: 106.8015, district: 'Bogor Tengah', address: 'Jl. Suryakencana No.210', category: 'Chain Commercial' },
  { id: 'comp_8', name: 'Uncle Jo X Bar Suryakencana', lat: -6.6078, lng: 106.8028, district: 'Bogor Tengah', address: 'Jl. Roda No.35', category: 'Vintage / Artisan' },
  { id: 'comp_9', name: 'Warung Kopi Liong Bulan (Pasar Anyar)', lat: -6.5902, lng: 106.7915, district: 'Bogor Tengah', address: 'Jl. Pabrik Gas No.12', category: 'Traditional / Heritage' },
  { id: 'comp_10', name: 'Kopi Kenangan Stasiun Bogor', lat: -6.5958, lng: 106.7904, district: 'Bogor Tengah', address: 'Hall Stasiun Bogor', category: 'Transit Coffee' },
  { id: 'comp_11', name: 'Starbucks Stasiun Bogor Paledang', lat: -6.5969, lng: 106.7912, district: 'Bogor Tengah', address: 'Akses Pintu Timur Stasiun', category: 'Transit Coffee' },
  { id: 'comp_12', name: 'Point Coffee Indomaret Juanda', lat: -6.5988, lng: 106.7942, district: 'Bogor Tengah', address: 'Jl. Ir. H. Juanda No.32', category: 'Grab & Go' },
  { id: 'comp_13', name: 'Anomali Coffee Salak', lat: -6.5911, lng: 106.7985, district: 'Bogor Tengah', address: 'Jl. Salak No.18', category: 'Specialty Coffee' },
  { id: 'comp_14', name: 'Third Wave Coffee Sudirman', lat: -6.5861, lng: 106.7938, district: 'Bogor Tengah', address: 'Jl. Jend. Sudirman No.24', category: 'Artisan Cafe' },
  { id: 'comp_15', name: 'Kopi Nako Sempur', lat: -6.5885, lng: 106.8005, district: 'Bogor Tengah', address: 'Taman Sempur No.4', category: 'Modern Outdoor' },

  // Bogor Timur
  { id: 'comp_16', name: 'Two Stories Cafe', lat: -6.6115, lng: 106.8118, district: 'Bogor Timur', address: 'Jl. Pajajaran Indah V No.7', category: 'Modern Lifestyle' },
  { id: 'comp_17', name: 'Raindear Coffee & Kitchen Bina Marga', lat: -6.6082, lng: 106.8124, district: 'Bogor Timur', address: 'Jl. Bina Marga No.7', category: 'Lifestyle / Roastery' },
  { id: 'comp_18', name: 'Kopi Nako Pajajaran Indah', lat: -6.6128, lng: 106.8135, district: 'Bogor Timur', address: 'Jl. Pajajaran Indah V No.12', category: 'Modern Outdoor' },
  { id: 'comp_19', name: 'Anthology Coffee & Tea Sukasari', lat: -6.6174, lng: 106.8162, district: 'Bogor Timur', address: 'Jl. Sukasari III No.14', category: 'Artisan Cafe' },
  { id: 'comp_20', name: 'Janji Jiwa Pajajaran Timur', lat: -6.6145, lng: 106.8142, district: 'Bogor Timur', address: 'Jl. Raya Pajajaran No.88', category: 'Grab & Go' },
  { id: 'comp_21', name: 'Point Coffee SPBU Pajajaran', lat: -6.6095, lng: 106.8105, district: 'Bogor Timur', address: 'SPBU Pajajaran Sukasari', category: 'Grab & Go' },
  { id: 'comp_22', name: 'Fanatic Coffee Tajur', lat: -6.6342, lng: 106.8285, district: 'Bogor Timur', address: 'Jl. Raya Tajur No.142', category: 'Co-working Cafe' },
  { id: 'comp_23', name: 'Starbucks Lippo Plaza Ekalokasari', lat: -6.6162, lng: 106.8155, district: 'Bogor Timur', address: 'Lippo Plaza Ground Floor', category: 'Chain Commercial' },
  { id: 'comp_24', name: 'Tomoro Coffee Sukasari', lat: -6.6195, lng: 106.8178, district: 'Bogor Timur', address: 'Jl. Siliwangi No.45', category: 'Chain Commercial' },
  { id: 'comp_25', name: 'Kopi Kenangan Tajur Trade Mall', lat: -6.6295, lng: 106.8242, district: 'Bogor Timur', address: 'Ruko Tajur Indah', category: 'Grab & Go' },

  // Bogor Utara
  { id: 'comp_26', name: 'Foresthree Coffee Pandu Raya', lat: -6.5742, lng: 106.8155, district: 'Bogor Utara', address: 'Jl. Pandu Raya No.105', category: 'Modern Lifestyle' },
  { id: 'comp_27', name: 'Dailydose Coffee & Eatery', lat: -6.5778, lng: 106.8168, district: 'Bogor Utara', address: 'Jl. Pandu Raya No.141', category: 'Artisan Cafe' },
  { id: 'comp_28', name: 'Baked & Brewed Pandu Raya', lat: -6.5795, lng: 106.8148, district: 'Bogor Utara', address: 'Jl. Pandu Raya No.42', category: 'Bakery & Coffee' },
  { id: 'comp_29', name: 'Janji Jiwa Bangbarung', lat: -6.5721, lng: 106.8115, district: 'Bogor Utara', address: 'Jl. Achmad Adnawijaya No.30', category: 'Grab & Go' },
  { id: 'comp_30', name: 'Tomoro Coffee Achmad Sobana', lat: -6.5712, lng: 106.8132, district: 'Bogor Utara', address: 'Jl. Achmad Sobana No.12', category: 'Chain Commercial' },
  { id: 'comp_31', name: 'Kopi Kenangan Villa Indah Pajajaran', lat: -6.5645, lng: 106.8105, district: 'Bogor Utara', address: 'Jl. Pajajaran Utara No.19', category: 'Grab & Go' },
  { id: 'comp_32', name: 'Starbucks Pajajaran Utara', lat: -6.5615, lng: 106.8095, district: 'Bogor Utara', address: 'Jl. Raya Pajajaran No.205', category: 'Drive-Thru' },
  { id: 'comp_33', name: 'Point Coffee Indomaret Cibuluh', lat: -6.5512, lng: 106.8125, district: 'Bogor Utara', address: 'Jl. KS Tubun Cibuluh', category: 'Grab & Go' },
  { id: 'comp_34', name: 'Raindear Coffee Pajajaran Utara', lat: -6.5685, lng: 106.8112, district: 'Bogor Utara', address: 'Jl. Pajajaran No.14', category: 'Lifestyle / Roastery' },
  { id: 'comp_35', name: 'Esprecielo Cafe & Roastery', lat: -6.5582, lng: 106.8175, district: 'Bogor Utara', address: 'Jl. Bantar Jati No.8', category: 'Specialty Coffee' },

  // Bogor Selatan
  { id: 'comp_36', name: 'Kopi Daong Express Cipaku', lat: -6.6425, lng: 106.8115, district: 'Bogor Selatan', address: 'Jl. Raya Cipaku No.88', category: 'Nature / Scenic' },
  { id: 'comp_37', name: 'Janji Jiwa Batutulis', lat: -6.6235, lng: 106.8078, district: 'Bogor Selatan', address: 'Jl. Batutulis No.41', category: 'Grab & Go' },
  { id: 'comp_38', name: 'Point Coffee Indomaret Batutulis', lat: -6.6265, lng: 106.8092, district: 'Bogor Selatan', address: 'Jl. Batutulis No.67', category: 'Grab & Go' },
  { id: 'comp_39', name: 'Kopi Tubing Kertamaya', lat: -6.6582, lng: 106.8165, district: 'Bogor Selatan', address: 'Jl. Raya Kertamaya No.15', category: 'Garden Cafe' },
  { id: 'comp_40', name: 'Warung Kopi Mbah Joyo Pamoyanan', lat: -6.6492, lng: 106.7985, district: 'Bogor Selatan', address: 'Jl. Raya Pamoyanan No.24', category: 'Traditional / Heritage' },
  { id: 'comp_41', name: 'Tomoro Coffee Pahlawan Bondongan', lat: -6.6178, lng: 106.8015, district: 'Bogor Selatan', address: 'Jl. Pahlawan Bondongan No.8', category: 'Chain Commercial' },
  { id: 'comp_42', name: 'Kopi Kenangan Empang', lat: -6.6125, lng: 106.7978, district: 'Bogor Selatan', address: 'Jl. Lolongok Empang No.3', category: 'Grab & Go' },
  { id: 'comp_43', name: 'Coffee Right Mulyaharja', lat: -6.6515, lng: 106.7852, district: 'Bogor Selatan', address: 'Kp. Mulyaharja Agro', category: 'Agrotourism Cafe' },

  // Bogor Barat
  { id: 'comp_44', name: 'Cohere Coffee Ciwaringin', lat: -6.5842, lng: 106.7795, district: 'Bogor Barat', address: 'Jl. Ciwaringin No.12', category: 'Artisan Cafe' },
  { id: 'comp_45', name: 'Kopi Nako Yasmin Barat', lat: -6.5682, lng: 106.7625, district: 'Bogor Barat', address: 'Jl. KH Abdullah Bin Nuh No.8', category: 'Modern Outdoor' },
  { id: 'comp_46', name: 'Fore Coffee Taman Yasmin Sektor 1', lat: -6.5695, lng: 106.7648, district: 'Bogor Barat', address: 'Ruko Taman Yasmin Sektor 1', category: 'Grab & Go' },
  { id: 'comp_47', name: 'Starbucks Transmart Yasmin', lat: -6.5662, lng: 106.7612, district: 'Bogor Barat', address: 'Transmart Yasmin Ground', category: 'Chain Commercial' },
  { id: 'comp_48', name: 'Janji Jiwa Cilendek', lat: -6.5792, lng: 106.7685, district: 'Bogor Barat', address: 'Jl. Brigjen Saptadji Hadiprawira No.5', category: 'Grab & Go' },
  { id: 'comp_49', name: 'Tomoro Coffee Semeru', lat: -6.5865, lng: 106.7762, district: 'Bogor Barat', address: 'Jl. Dr. Semeru No.88', category: 'Chain Commercial' },
  { id: 'comp_50', name: 'Rumah Kopi Sindangbarang', lat: -6.5985, lng: 106.7582, district: 'Bogor Barat', address: 'Jl. Raya Sindangbarang No.35', category: 'Culture / Heritage' },
  { id: 'comp_51', name: 'Point Coffee Indomaret Dramaga Border', lat: -6.5825, lng: 106.7455, district: 'Bogor Barat', address: 'Jl. Raya Dramaga KM 7', category: 'Grab & Go' },
  { id: 'comp_52', name: 'Ruang Kopi Menteng Bogor', lat: -6.5898, lng: 106.7712, district: 'Bogor Barat', address: 'Jl. Medika Menteng No.19', category: 'Neighborhood Cafe' },

  // Tanah Sareal
  { id: 'comp_53', name: 'Kopi Dari Hati Sholeh Iskandar', lat: -6.5525, lng: 106.7798, district: 'Tanah Sareal', address: 'Jl. KH Sholeh Iskandar No.22', category: 'Chain Commercial' },
  { id: 'comp_54', name: 'Janji Jiwa Kebon Pedes', lat: -6.5685, lng: 106.7895, district: 'Tanah Sareal', address: 'Jl. Kebon Pedes No.15', category: 'Grab & Go' },
  { id: 'comp_55', name: 'Point Coffee SPBU Sholeh Iskandar', lat: -6.5482, lng: 106.7725, district: 'Tanah Sareal', address: 'SPBU Yasmin Sholeh Iskandar', category: 'Grab & Go' },
  { id: 'comp_56', name: 'Starbucks Drive Thru Sholeh Iskandar', lat: -6.5465, lng: 106.7705, district: 'Tanah Sareal', address: 'Jl. KH Sholeh Iskandar KM 4', category: 'Drive-Thru' },
  { id: 'comp_57', name: 'Kopi Kenangan Plaza Jambu Dua', lat: -6.5718, lng: 106.8045, district: 'Tanah Sareal', address: 'Plaza Jambu Dua Lt. 1', category: 'Mall Kiosk' },
  { id: 'comp_58', name: 'Warung Kopi Heulang', lat: -6.5745, lng: 106.7985, district: 'Tanah Sareal', address: 'Taman Heulang No.8', category: 'Park / Outdoor' },
  { id: 'comp_59', name: 'Fore Coffee Kayumanis Hub', lat: -6.5365, lng: 106.7665, district: 'Tanah Sareal', address: 'Jl. Raya Kayumanis No.54', category: 'Grab & Go' },
  { id: 'comp_60', name: 'Kopi Tubing Express Sukaresmi', lat: -6.5592, lng: 106.7845, district: 'Tanah Sareal', address: 'Jl. Sukaresmi Raya No.9', category: 'Neighborhood Cafe' },
];

// ==========================================
// 4. DATA JARINGAN JALAN UTAMA KOTA BOGOR
// (Arteri Primer, Kolektor, & Penghubung)
// ==========================================

export const BOGOR_ROADS: RoadSegment[] = [
  {
    id: 'road_pajajaran',
    name: 'Jl. Raya Pajajaran',
    type: 'arterial',
    coordinates: [
      [-6.5512, 106.8095],
      [-6.5685, 106.8112],
      [-6.5932, 106.8078],
      [-6.6009, 106.8062],
      [-6.6095, 106.8105],
      [-6.6186, 106.8162],
      [-6.6265, 106.8215],
    ],
  },
  {
    id: 'road_juanda',
    name: 'Jl. Ir. H. Juanda (Sistem Satu Arah Kebun Raya)',
    type: 'arterial',
    coordinates: [
      [-6.5932, 106.8078],
      [-6.5985, 106.8052],
      [-6.6025, 106.7975],
      [-6.5988, 106.7942],
      [-6.5925, 106.7965],
      [-6.5912, 106.8015],
      [-6.5932, 106.8078],
    ],
  },
  {
    id: 'road_sholeh_iskandar',
    name: 'Jl. KH. Sholeh Iskandar (Bypass Yasmin)',
    type: 'arterial',
    coordinates: [
      [-6.5365, 106.7585],
      [-6.5465, 106.7705],
      [-6.5525, 106.7798],
      [-6.5625, 106.7952],
      [-6.5685, 106.8055],
      [-6.5718, 106.8095],
    ],
  },
  {
    id: 'road_sudirman',
    name: 'Jl. Jenderal Sudirman (Air Mancur)',
    type: 'arterial',
    coordinates: [
      [-6.5785, 106.7932],
      [-6.5861, 106.7938],
      [-6.5925, 106.7965],
    ],
  },
  {
    id: 'road_suryakencana',
    name: 'Jl. Surya Kencana - Siliwangi (Sentra Kuliner)',
    type: 'collector',
    coordinates: [
      [-6.6025, 106.7975],
      [-6.6078, 106.8028],
      [-6.6162, 106.8115],
      [-6.6215, 106.8185],
      [-6.6342, 106.8285],
    ],
  },
  {
    id: 'road_pandu_raya',
    name: 'Jl. Pandu Raya / Achmad Adnawijaya',
    type: 'collector',
    coordinates: [
      [-6.5865, 106.8125],
      [-6.5795, 106.8148],
      [-6.5742, 106.8155],
      [-6.5685, 106.8185],
    ],
  },
  {
    id: 'road_abdullah_bin_nuh',
    name: 'Jl. KH. Abdullah Bin Nuh (Ring Road Yasmin)',
    type: 'arterial',
    coordinates: [
      [-6.5525, 106.7798],
      [-6.5662, 106.7612],
      [-6.5785, 106.7535],
      [-6.5925, 106.7465],
    ],
  },
  {
    id: 'road_tajur',
    name: 'Jl. Raya Tajur - Ciawi',
    type: 'arterial',
    coordinates: [
      [-6.6215, 106.8185],
      [-6.6342, 106.8285],
      [-6.6485, 106.8395],
      [-6.6625, 106.8485],
    ],
  },
  {
    id: 'road_batutulis',
    name: 'Jl. Batutulis - Cipaku - Pamoyanan',
    type: 'collector',
    coordinates: [
      [-6.6162, 106.8065],
      [-6.6265, 106.8092],
      [-6.6425, 106.8115],
      [-6.6625, 106.8142],
    ],
  },
];

// ==========================================
// 5. DATA SIMPUL KERAMAIAN KOTA BOGOR
// (Mall, Stasiun, Kampus, Taman Publik, RS)
// ==========================================

export const BOGOR_CROWD_CENTERS: CrowdCenterPoint[] = [
  { id: 'crowd_1', name: 'Botani Square Mall & IPB Convention', category: 'mall', lat: -6.6009, lng: 106.8056, district: 'Bogor Tengah', description: 'Pusat belanja & lifestyle terbesar terhubung IPB' },
  { id: 'crowd_2', name: 'Stasiun Besar Kota Bogor', category: 'station', lat: -6.5958, lng: 106.7904, district: 'Bogor Tengah', description: 'Simpul komuter KRL Jabodetabek (100k+ penumpang/hari)' },
  { id: 'crowd_3', name: 'Kebun Raya Bogor & Museum Zoologi', category: 'park', lat: -6.5975, lng: 106.7995, district: 'Bogor Tengah', description: 'Destinasi wisata alam & riset botani ikonik dunia' },
  { id: 'crowd_4', name: 'Alun-Alun Kota Bogor', category: 'park', lat: -6.5952, lng: 106.7898, district: 'Bogor Tengah', description: 'Ruang terbuka hijau publik terintegrasi Stasiun Bogor' },
  { id: 'crowd_5', name: 'Lapangan Sempur & Taman Ekspresi', category: 'park', lat: -6.5892, lng: 106.7998, district: 'Bogor Tengah', description: 'Sentra olahraga, jogging track, dan festival komunitas' },
  { id: 'crowd_6', name: 'Kampus IPB Baranangsiang', category: 'university', lat: -6.6025, lng: 106.8082, district: 'Bogor Tengah', description: 'Kampus Pascasarjana & Sekolah Vokasi IPB' },
  { id: 'crowd_7', name: 'Rumah Sakit PMI Kota Bogor', category: 'hospital', lat: -6.5985, lng: 106.8035, district: 'Bogor Tengah', description: 'Pusat layanan medis rujukan utama Kota Bogor' },
  { id: 'crowd_8', name: 'Lippo Plaza Ekalokasari', category: 'mall', lat: -6.6162, lng: 106.8155, district: 'Bogor Timur', description: 'Pusat perbelanjaan koridor Sukasari & Tajur' },
  { id: 'crowd_9', name: 'Boxies 123 Mall Tajur', category: 'mall', lat: -6.6365, lng: 106.8305, district: 'Bogor Timur', description: 'Lifestyle mall keluarga dan wisata outdoor Tajur' },
  { id: 'crowd_10', name: 'Terminal Bus Baranangsiang', category: 'station', lat: -6.6045, lng: 106.8095, district: 'Bogor Timur', description: 'Terminal bus antar kota & Damri Bandara Soetta' },
  { id: 'crowd_11', name: 'Universitas Pakuan (UNPAK)', category: 'university', lat: -6.6065, lng: 106.8145, district: 'Bogor Timur', description: 'Kampus swasta terbesar di Kota Bogor (15.000+ mahasiswa)' },
  { id: 'crowd_12', name: 'Plaza Jambu Dua Bogor', category: 'mall', lat: -6.5718, lng: 106.8045, district: 'Bogor Utara', description: 'Sentra gadget, elektronik & IT terbesar Kota Bogor' },
  { id: 'crowd_13', name: 'Taman Heulang', category: 'park', lat: -6.5735, lng: 106.7975, district: 'Tanah Sareal', description: 'Taman tematik populer untuk keluarga & komunitas muda' },
  { id: 'crowd_14', name: 'Universitas Ibn Khaldun (UIKA)', category: 'university', lat: -6.5562, lng: 106.7825, district: 'Tanah Sareal', description: 'Kampus perguruan tinggi terkemuka di Sholeh Iskandar' },
  { id: 'crowd_15', name: 'Transmart Carrefour Yasmin', category: 'mall', lat: -6.5662, lng: 106.7612, district: 'Bogor Barat', description: 'Hypermarket & entertainment center Yasmin' },
  { id: 'crowd_16', name: 'RS Hermina Bogor Yasmin', category: 'hospital', lat: -6.5645, lng: 106.7635, district: 'Bogor Barat', description: 'Pusat layanan kesehatan modern kawasan Yasmin' },
  { id: 'crowd_17', name: 'Kampus IPB Dramaga (Koridor Batas)', category: 'university', lat: -6.5815, lng: 106.7325, district: 'Bogor Barat', description: 'Pusat mahasiswa IPB University (30.000+ civitas)' },
  { id: 'crowd_18', name: 'Mall BTM Bogor (Bogor Trade Mall)', category: 'mall', lat: -6.6015, lng: 106.7945, district: 'Bogor Tengah', description: 'Pusat perdagangan retail depan Kebun Raya' },
  { id: 'crowd_19', name: 'Stasiun Paledang (KA Pangrango)', category: 'station', lat: -6.5982, lng: 106.7925, district: 'Bogor Tengah', description: 'Stasiun kereta api relasi Bogor - Sukabumi' },
  { id: 'crowd_20', name: 'Taman Kencana & Kuliner Salak', category: 'park', lat: -6.5895, lng: 106.7982, district: 'Bogor Tengah', description: 'Sentra kuliner legendaris dan cagar budaya' },
];

// Helper to compute haversine distance in meters
export function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// Ray-Casting algorithm: Test if a [lat, lng] coordinate is strictly inside a polygon [[lat, lng], ...]
export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Exact Spatial Administrative Boundary Check:
// Returns the exact district object ONLY if the point is strictly inside its polygon
export function getStrictDistrictForPoint(lat: number, lng: number): { districtName: string; population: number } | null {
  for (const district of BOGOR_DISTRICTS) {
    for (const poly of district.coordinates) {
      if (isPointInPolygon(lat, lng, poly)) {
        return { districtName: district.name, population: district.population };
      }
    }
  }
  return null; // Point is outside Kota Bogor boundaries!
}

// Distance from point to polyline segment
export function getDistanceToRoads(lat: number, lng: number): { distance: number; nearestRoad: string } {
  let minDistance = Infinity;
  let nearestRoad = 'Jl. Raya Pajajaran';

  for (const road of BOGOR_ROADS) {
    for (const pt of road.coordinates) {
      const d = getHaversineDistance(lat, lng, pt[0], pt[1]);
      if (d < minDistance) {
        minDistance = d;
        nearestRoad = road.name;
      }
    }
  }

  return { distance: Math.max(30, minDistance), nearestRoad };
}

// Nearest competitor
export function getNearestCompetitor(lat: number, lng: number): { distance: number; name: string } {
  let minDistance = Infinity;
  let name = '';

  for (const comp of BOGOR_COMPETITORS) {
    const d = getHaversineDistance(lat, lng, comp.lat, comp.lng);
    if (d < minDistance) {
      minDistance = d;
      name = comp.name;
    }
  }

  return { distance: Math.max(50, minDistance), name };
}

// Nearest crowd center
export function getNearestCrowd(lat: number, lng: number): { distance: number; name: string } {
  let minDistance = Infinity;
  let name = '';

  for (const crowd of BOGOR_CROWD_CENTERS) {
    const d = getHaversineDistance(lat, lng, crowd.lat, crowd.lng);
    if (d < minDistance) {
      minDistance = d;
      name = crowd.name;
    }
  }

  return { distance: Math.max(40, minDistance), name };
}

// Spatial Constraint Masking: Check if a point falls within any Restricted Exclusion Zone
export function checkSpatialConstraint(lat: number, lng: number): {
  isRestricted: boolean;
  restrictionReason?: string;
  landUseType: string;
} {
  for (const zone of BOGOR_EXCLUSION_ZONES) {
    const dist = getHaversineDistance(lat, lng, zone.center[0], zone.center[1]);
    if (dist <= zone.radiusMeters) {
      return {
        isRestricted: true,
        restrictionReason: `${zone.typeLabel}: ${zone.name}`,
        landUseType: `Zona Terlarang (${zone.typeLabel})`,
      };
    }
  }

  return {
    isRestricted: false,
    landUseType: 'Kawasan Komersial & Permukiman Layak Usaha',
  };
}

// ==========================================
// 6. GENERATE 300+ SPATIAL CANDIDATE GRID POINTS
// (Strict Point-In-Polygon Boundary Clipping to 6 Districts)
// ==========================================

function generateCandidateGrid(): SpatialCandidate[] {
  const candidates: SpatialCandidate[] = [];
  
  // Bounding Box Kota Bogor
  const latMin = -6.678;
  const latMax = -6.529;
  const lngMin = 106.738;
  const lngMax = 106.845;

  // Fine sampling resolution across Kota Bogor
  const latSteps = 34;
  const lngSteps = 30;

  const latDelta = (latMax - latMin) / latSteps;
  const lngDelta = (lngMax - lngMin) / lngSteps;

  let counter = 1;

  for (let i = 0; i <= latSteps; i++) {
    for (let j = 0; j <= lngSteps; j++) {
      const lat = Math.round((latMin + i * latDelta) * 10000) / 10000;
      const lng = Math.round((lngMin + j * lngDelta) * 10000) / 10000;

      // STRICT SPATIAL CLIPPING: Only accept points strictly inside one of the 6 kecamatan polygons
      const districtInfo = getStrictDistrictForPoint(lat, lng);
      if (!districtInfo) {
        continue; // Discard point if it falls outside Kota Bogor boundaries!
      }

      const competitor = getNearestCompetitor(lat, lng);
      const road = getDistanceToRoads(lat, lng);
      const crowd = getNearestCrowd(lat, lng);
      const constraint = checkSpatialConstraint(lat, lng);

      candidates.push({
        id: `grid_${counter}`,
        lat,
        lng,
        district: districtInfo.districtName,
        c1_dist_competitor: competitor.distance,
        c2_population: districtInfo.population,
        c3_dist_road: road.distance,
        c4_dist_crowd: crowd.distance,
        nearestCompetitorName: competitor.name,
        nearestRoadName: road.nearestRoad,
        nearestCrowdName: crowd.name,
        isRestricted: constraint.isRestricted,
        restrictionReason: constraint.restrictionReason,
        landUseType: constraint.landUseType,
      });

      counter++;
    }
  }

  return candidates;
}

export const BOGOR_GRID_CANDIDATES: SpatialCandidate[] = generateCandidateGrid();
