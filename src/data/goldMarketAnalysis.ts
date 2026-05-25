// ═══════════════════════════════════════
// GOLD MARKET ANALYSIS DATA
// Updated: 2024-01-XX (Template Structure)
// ═══════════════════════════════════════

export interface GoldPrice {
  asset: string;
  price: number;
  currency: string;
  change24h: number;
  changePercent: number;
  volume?: string;
  source: string;
  timestamp: string;
}

export interface TechnicalIndicator {
  name: string;
  value: number | string;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

export interface SupportResistance {
  level: number;
  type: 'support' | 'resistance';
  strength: 'weak' | 'moderate' | 'strong';
}

export interface MarketDriver {
  title: string;
  impact: 'high' | 'medium' | 'low';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  summary: string;
  source: string;
  timestamp: string;
}

export interface TradingSetup {
  type: 'long' | 'short';
  condition: string;
  entry: number;
  target: number;
  stop: number;
  riskReward: string;
  confidence: number; // 0-100
}

export interface GoldMarketAnalysis {
  date: string;
  lastUpdated: string;
  prices: GoldPrice[];
  trend: 'bullish' | 'bearish' | 'neutral';
  technicals: TechnicalIndicator[];
  levels: SupportResistance[];
  drivers: MarketDriver[];
  setups: TradingSetup[];
  recommendation: {
    bias: 'bullish' | 'bearish' | 'wait-and-see';
    positionSize: string;
    watchFor: string[];
  };
  risks: string[];
  confidence: number; // 0-5 stars
}

// ═══════════════════════════════════════
// LIVE DATA (Template — Replace with Real API)
// ═══════════════════════════════════════

export const getCurrentGoldAnalysis = (): GoldMarketAnalysis => {
  const now = new Date().toISOString();
  const today = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    date: today,
    lastUpdated: now,

    // 📈 PRICE SNAPSHOT
    prices: [
      {
        asset: 'XAU/USD Spot',
        price: 2678.50,
        currency: 'USD',
        change24h: 15.30,
        changePercent: 0.57,
        volume: '145M oz',
        source: 'Kitco/TradingView',
        timestamp: now,
      },
      {
        asset: 'Gold Futures (GC)',
        price: 2681.20,
        currency: 'USD',
        change24h: 14.80,
        changePercent: 0.55,
        volume: '287k contracts',
        source: 'Investing.com',
        timestamp: now,
      },
      {
        asset: 'ทองคำแท่ง 96.5%',
        price: 42850,
        currency: 'THB',
        change24h: 150,
        changePercent: 0.35,
        source: 'YCA/GoldTraders',
        timestamp: now,
      },
    ],

    // 🔍 TECHNICAL ANALYSIS
    trend: 'bullish',
    
    technicals: [
      {
        name: 'RSI(14)',
        value: 58.3,
        signal: 'neutral',
        description: 'Neutral zone — room to move higher before overbought',
      },
      {
        name: 'MACD',
        value: 'Bullish crossover',
        signal: 'bullish',
        description: 'Recent golden cross on 4H chart — momentum building',
      },
      {
        name: 'MA(50)',
        value: 2645.20,
        signal: 'bullish',
        description: 'Price trading above MA(50) — short-term uptrend intact',
      },
      {
        name: 'MA(200)',
        value: 2598.40,
        signal: 'bullish',
        description: 'Well above long-term average — primary uptrend strong',
      },
      {
        name: 'Bollinger Bands',
        value: 'Mid-to-upper band',
        signal: 'neutral',
        description: 'Price in expansion phase — volatility increasing',
      },
    ],

    // 🎯 KEY LEVELS
    levels: [
      { level: 2700, type: 'resistance', strength: 'strong' },
      { level: 2690, type: 'resistance', strength: 'moderate' },
      { level: 2665, type: 'support', strength: 'moderate' },
      { level: 2645, type: 'support', strength: 'strong' },
      { level: 2620, type: 'support', strength: 'strong' },
    ],

    // 📰 MARKET DRIVERS
    drivers: [
      {
        title: 'Fed คงดอกเบี้ย — รอดูข้อมูลเพิ่มก่อนตัดสินใจ',
        impact: 'high',
        sentiment: 'bullish',
        summary: 'FOMC ส่งสัญญาณอาจชะลอการขึ้นดอกเบี้ย หนุนราคาทองคำ เนื่องจากค่าเงินดอลลาร์อ่อนค่า',
        source: 'Reuters',
        timestamp: now,
      },
      {
        title: 'ความตึงเครียดตะวันออกกลาง',
        impact: 'medium',
        sentiment: 'bullish',
        summary: 'Safe-haven demand เพิ่มขึ้นจากความไม่แน่นอนทางภูมิรัฐศาสตร์',
        source: 'Bloomberg',
        timestamp: now,
      },
      {
        title: 'USD Index (DXY) อ่อนค่า',
        impact: 'high',
        sentiment: 'bullish',
        summary: 'DXY ลงมาที่ 103.45 (-0.32%) — สหสัมพันธ์ผกผันกับทองคำ ส่งผลบวก',
        source: 'Investing.com',
        timestamp: now,
      },
      {
        title: 'Central Bank Buying ยังคงแข็งแกร่ง',
        impact: 'medium',
        sentiment: 'bullish',
        summary: 'ธนาคารกลางทั่วโลก โดยเฉพาะจีน-อินเดีย ยังซื้อทองคำสำรองต่อเนื่อง',
        source: 'World Gold Council',
        timestamp: now,
      },
    ],

    // 💡 TRADING SETUPS
    setups: [
      {
        type: 'long',
        condition: 'Breakout above $2,690',
        entry: 2692,
        target: 2725,
        stop: 2675,
        riskReward: '1:1.94',
        confidence: 75,
      },
      {
        type: 'long',
        condition: 'Pullback to support zone',
        entry: 2665,
        target: 2700,
        stop: 2650,
        riskReward: '1:2.33',
        confidence: 80,
      },
      {
        type: 'short',
        condition: 'Rejection at $2,700 with strong DXY',
        entry: 2698,
        target: 2665,
        stop: 2710,
        riskReward: '1:2.75',
        confidence: 60,
      },
    ],

    // 🎯 RECOMMENDATION
    recommendation: {
      bias: 'bullish',
      positionSize: '2-3% of capital (moderate volatility)',
      watchFor: [
        'Break above $2,690 with volume → target $2,720-2,740',
        'DXY reversal above 104.00 → could pressure gold',
        'Fed speakers this week — any hawkish tone = risk',
        'Support hold at $2,665 → continuation likely',
      ],
    },

    // ⚠️ RISKS
    risks: [
      'Fed officials hawkish comments อาจทำให้ทองคำปรับฐานแรง',
      'Dollar strength rally จากข้อมูลเศรษฐกิจสดใส',
      'Profit-taking ใกล้ระดับ $2,700 (psychological resistance)',
      'Geopolitical de-escalation → ลด safe-haven demand',
    ],

    confidence: 4, // 4/5 stars
  };
};

// ═══════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════

export const getSignalColor = (signal: 'bullish' | 'bearish' | 'neutral'): string => {
  switch (signal) {
    case 'bullish':
      return 'var(--green)';
    case 'bearish':
      return 'var(--red)';
    case 'neutral':
      return 'var(--muted)';
  }
};

export const getImpactColor = (impact: 'high' | 'medium' | 'low'): string => {
  switch (impact) {
    case 'high':
      return 'var(--red)';
    case 'medium':
      return 'var(--orange)';
    case 'low':
      return 'var(--muted)';
  }
};

export const getConfidenceStars = (confidence: number): string => {
  const stars = Math.round(confidence);
  return '⭐'.repeat(stars);
};

export const formatPrice = (price: number, currency: string = 'USD'): string => {
  if (currency === 'THB') {
    return `฿${price.toLocaleString('th-TH')}`;
  }
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatChange = (change: number, showSign: boolean = true): string => {
  const sign = showSign && change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
};
