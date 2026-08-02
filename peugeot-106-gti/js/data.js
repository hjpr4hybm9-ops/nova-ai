// Sabit giriş şifresi — bu sayfayı sadece şifreyi bilen açabilir.
const APP_PASSWORD = "106GTI2001";

const BASE_CAR = {
  name: "Peugeot 106 GTI",
  year: 2001,
  engine: "1.6L 16V",
  baseHp: 118,
  weight: 1011,
};

const PARTS = {
  engine: {
    label: "Motor",
    icon: "🔧",
    tiers: [
      { name: "Stok Motor", desc: "118 HP fabrika ayarı", price: 0, accelMult: 1.00, speedMult: 1.00 },
      { name: "Spor ECU Chip", desc: "Yeniden haritalama, +22 HP", price: 8000, accelMult: 1.15, speedMult: 1.08 },
      { name: "Turbo Kit", desc: "Küçük turbo takviyesi, +57 HP", price: 20000, accelMult: 1.35, speedMult: 1.18 },
    ],
  },
  tires: {
    label: "Lastik",
    icon: "🛞",
    tiers: [
      { name: "Stok Lastik", desc: "Standart yol lastiği", price: 0, gripMult: 1.00 },
      { name: "Yarı Slick", desc: "Daha fazla tutuş", price: 6000, gripMult: 1.08 },
      { name: "Slick Lastik", desc: "Pist için maksimum tutuş", price: 15000, gripMult: 1.18 },
    ],
  },
  suspension: {
    label: "Süspansiyon",
    icon: "🔩",
    tiers: [
      { name: "Stok Süspansiyon", desc: "Fabrika ayarı", price: 0, turnMult: 1.00 },
      { name: "Spor Amortisör", desc: "Daha çevik direksiyon", price: 5000, turnMult: 1.15 },
      { name: "Coilover Kit", desc: "Yarış tipi süspansiyon", price: 12000, turnMult: 1.30 },
    ],
  },
  brakes: {
    label: "Fren",
    icon: "🛑",
    tiers: [
      { name: "Stok Fren", desc: "Fabrika balata/disk", price: 0, brakeMult: 1.00 },
      { name: "Spor Balata", desc: "Daha kısa fren mesafesi", price: 4000, brakeMult: 1.25 },
      { name: "Büyük Disk Kiti", desc: "Pist için güçlü frenleme", price: 10000, brakeMult: 1.50 },
    ],
  },
};

const PAINT_COLORS = [
  { id: "rouge", name: "Kırmızı (GTI)", hex: "#d81c2c" },
  { id: "blanc", name: "Beyaz", hex: "#f4f6fb" },
  { id: "bleu", name: "Mavi", hex: "#1c5fd8" },
  { id: "jaune", name: "Sarı", hex: "#f2c11d" },
  { id: "noir", name: "Siyah", hex: "#14161c" },
  { id: "vert", name: "Racing Yeşil", hex: "#0f6b3f" },
];

const RACE_CONFIG = { laps: 3 };
