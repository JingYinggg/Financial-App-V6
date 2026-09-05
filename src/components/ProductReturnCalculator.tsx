import React, { useState, useMemo } from 'react';
import { useWealth } from '../context/WealthContext';
import { ProductReturnItem, CalculatorScenario } from '../types';
import {
  Target,
  Scale,
  Sparkles,
  LineChart,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Flame,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Sliders,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Bookmark,
  Layers,
  ArrowUpRight,
  Split,
  ChevronDown,
  Wallet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ComposedChart,
  Line
} from 'recharts';

export type CalculatorTab = 'goal' | 'position' | 'gap' | 'recommendation' | 'projection';
export type StrategyKey = 'conservative' | 'balanced' | 'growth' | 'custom';

export interface StrategyDetail {
  key: StrategyKey;
  name: string;
  badge: string;
  expectedReturnRate: number; // in % p.a.
  riskProfile: 'Low Risk' | 'Moderate Risk' | 'High Growth' | 'Custom';
  riskDescription: string;
  bestFor: string;
  icon: typeof ShieldCheck;
  themeColor: string;
  assetAllocation: {
    name: string;
    category: string;
    percentage: number;
    expectedYield: string;
    description: string;
    color: string;
  }[];
  products: ProductReturnItem[];
}

export const STRATEGY_DEFINITIONS: Record<StrategyKey, StrategyDetail> = {
  conservative: {
    key: 'conservative',
    name: 'Conservative Strategy',
    badge: '🛡️ Defensive Yield & Capital Preservation',
    expectedReturnRate: 4.5,
    riskProfile: 'Low Risk',
    riskDescription: 'Near-zero capital volatility with reliable income distributions and cash liquidity.',
    bestFor: 'Emergency funds, near-retirement capital, short-to-medium horizons (< 5 years).',
    icon: ShieldCheck,
    themeColor: '#2563EB',
    assetAllocation: [
      {
        name: 'Fixed Deposits & Fixed-Income',
        category: 'Capital Preservation',
        percentage: 45,
        expectedYield: '3.80% - 4.50%',
        description: 'Term deposits and high-grade fixed income instruments for principal safety.',
        color: '#2563EB'
      },
      {
        name: 'Cash / Money Market',
        category: 'High Liquidity',
        percentage: 35,
        expectedYield: '3.50% - 4.20%',
        description: 'Daily interest liquidity reserves and capital preservation funds.',
        color: '#0284C7'
      },
      {
        name: 'Retirement / EPF',
        category: 'Statutory Savings',
        percentage: 20,
        expectedYield: '5.40% - 6.00%',
        description: 'Stable long-term statutory retirement compounding.',
        color: '#4F46E5'
      }
    ],
    products: [
      {
        id: 'c_1',
        name: 'Fixed Deposits & Fixed-Income',
        category: 'Fixed Yield',
        capitalAmount: 45000,
        weightPercent: 45,
        returnRatePercent: 4.2,
        payoutFrequency: 'annual',
        monthlyContribution: 450,
        color: '#2563EB',
        notes: 'Capital-protected fixed income instruments.'
      },
      {
        id: 'c_2',
        name: 'Cash / Money Market',
        category: 'Cash / MMF',
        capitalAmount: 35000,
        weightPercent: 35,
        returnRatePercent: 3.8,
        payoutFrequency: 'monthly',
        monthlyContribution: 350,
        color: '#0284C7',
        notes: 'High liquidity money market reserve.'
      },
      {
        id: 'c_3',
        name: 'Retirement / EPF',
        category: 'Retirement',
        capitalAmount: 20000,
        weightPercent: 20,
        returnRatePercent: 5.5,
        payoutFrequency: 'annual',
        monthlyContribution: 200,
        color: '#4F46E5',
        notes: 'Long-term compounding retirement savings.'
      }
    ]
  },
  balanced: {
    key: 'balanced',
    name: 'Balanced Strategy',
    badge: '⚖️ Optimized Income & Sustainable Compounding',
    expectedReturnRate: 7.0,
    riskProfile: 'Moderate Risk',
    riskDescription: 'Balanced mix of statutory retirement compounding, real estate yields, and global equity index growth.',
    bestFor: 'Wealth accumulation, FIRE aspirants, balanced risk-reward over 5–15 years.',
    icon: Scale,
    themeColor: '#4F46E5',
    assetAllocation: [
      {
        name: 'Retirement / EPF',
        category: 'Statutory Savings',
        percentage: 35,
        expectedYield: '5.50% - 6.00%',
        description: 'Statutory retirement fund compounding with consistent dividend distributions.',
        color: '#2563EB'
      },
      {
        name: 'Dividend Stocks',
        category: 'Income Equities',
        percentage: 30,
        expectedYield: '6.00% - 7.00%',
        description: 'High-dividend yielding equities and real estate investment trusts.',
        color: '#059669'
      },
      {
        name: 'Growth Funds / ETFs',
        category: 'Global Equities',
        percentage: 25,
        expectedYield: '8.50% - 10.00%',
        description: 'Broad market index funds and global equity expansion.',
        color: '#7C3AED'
      },
      {
        name: 'Cash / Money Market',
        category: 'Liquidity Buffer',
        percentage: 10,
        expectedYield: '3.50% - 4.00%',
        description: 'Cash reserves and money market funds for liquidity.',
        color: '#64748B'
      }
    ],
    products: [
      {
        id: 'b_1',
        name: 'Retirement / EPF',
        category: 'Retirement',
        capitalAmount: 35000,
        weightPercent: 35,
        returnRatePercent: 5.8,
        payoutFrequency: 'annual',
        monthlyContribution: 500,
        color: '#2563EB',
        notes: 'Statutory compounding core with guaranteed dividend floor.'
      },
      {
        id: 'b_2',
        name: 'Dividend Stocks',
        category: 'Equities / Stocks',
        capitalAmount: 30000,
        weightPercent: 30,
        returnRatePercent: 6.5,
        payoutFrequency: 'quarterly',
        monthlyContribution: 300,
        color: '#059669',
        notes: 'Steady dividend and rental yield distributions.'
      },
      {
        id: 'b_3',
        name: 'Growth Funds / ETFs',
        category: 'Equities / Stocks',
        capitalAmount: 25000,
        weightPercent: 25,
        returnRatePercent: 9.5,
        payoutFrequency: 'annual',
        monthlyContribution: 300,
        color: '#7C3AED',
        notes: 'Broad market index capitalization growth.'
      },
      {
        id: 'b_4',
        name: 'Cash / Money Market',
        category: 'Cash / MMF',
        capitalAmount: 10000,
        weightPercent: 10,
        returnRatePercent: 3.8,
        payoutFrequency: 'monthly',
        monthlyContribution: 100,
        color: '#64748B',
        notes: 'Emergency buffer and rebalancing liquidity.'
      }
    ]
  },
  growth: {
    key: 'growth',
    name: 'Growth Strategy',
    badge: '🚀 Global Equities & High-Alpha Compounding',
    expectedReturnRate: 10.0,
    riskProfile: 'High Growth',
    riskDescription: 'Heavier exposure to high-growth global innovators and equities for exponential compounding.',
    bestFor: 'Long-term wealth maximization (10+ years), aggressive early-career compounding runway.',
    icon: Flame,
    themeColor: '#7C3AED',
    assetAllocation: [
      {
        name: 'Growth Funds / ETFs',
        category: 'Global Equities',
        percentage: 65,
        expectedYield: '10.00% - 12.50%',
        description: 'High-growth global equity funds and technology sector indices.',
        color: '#7C3AED'
      },
      {
        name: 'Dividend Stocks',
        category: 'Income Equities',
        percentage: 25,
        expectedYield: '6.50% - 7.50%',
        description: 'Defensive cash-generating equities and yield-producing assets.',
        color: '#059669'
      },
      {
        name: 'Cash / Money Market',
        category: 'Liquidity Buffer',
        percentage: 10,
        expectedYield: '3.80% - 4.20%',
        description: 'Strategic cash reserve ready to capitalize on market dips.',
        color: '#64748B'
      }
    ],
    products: [
      {
        id: 'g_1',
        name: 'Growth Funds / ETFs',
        category: 'Equities / Stocks',
        capitalAmount: 65000,
        weightPercent: 65,
        returnRatePercent: 11.5,
        payoutFrequency: 'annual',
        monthlyContribution: 600,
        color: '#7C3AED',
        notes: 'High growth global innovators with long-term compounding.'
      },
      {
        id: 'g_2',
        name: 'Dividend Stocks',
        category: 'Equities / Stocks',
        capitalAmount: 25000,
        weightPercent: 25,
        returnRatePercent: 6.8,
        payoutFrequency: 'quarterly',
        monthlyContribution: 250,
        color: '#059669',
        notes: 'Cash-generating stabilizing asset.'
      },
      {
        id: 'g_3',
        name: 'Cash / Money Market',
        category: 'Cash / MMF',
        capitalAmount: 10000,
        weightPercent: 10,
        returnRatePercent: 4.0,
        payoutFrequency: 'monthly',
        monthlyContribution: 50,
        color: '#64748B',
        notes: 'Opportunity reserve and liquidity.'
      }
    ]
  },
  custom: {
    key: 'custom',
    name: 'Custom Asset Strategy',
    badge: '🛠️ Tailored Portfolio Allocator',
    expectedReturnRate: 7.0,
    riskProfile: 'Custom',
    riskDescription: 'Fully customizable asset allocations, individual return rates, and bespoke contributions.',
    bestFor: 'Bespoke portfolio structuring with user-specified products and rates.',
    icon: SlidersHorizontal,
    themeColor: '#0F172A',
    assetAllocation: [],
    products: []
  }
};

const PALETTE = ['#2563EB', '#059669', '#4F46E5', '#D97706', '#0284C7', '#7C3AED', '#E11D48', '#64748B'];

export const ProductReturnCalculator: React.FC = () => {
  const { holdings, passiveAccounts, balanceSheet } = useWealth();

  // Active Top Step Tab: Goal Setting > Calculate Gap > Recommendation Plan > Projection Plan
  const [activeTab, setActiveTab] = useState<CalculatorTab>('goal');

  // Step 1: Goal Setting State
  const [targetGoalAmount, setTargetGoalAmount] = useState<number>(500000);
  const [timeHorizonYears, setTimeHorizonYears] = useState<number>(10);
  const [startingBalance, setStartingBalance] = useState<number>(50000);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(1000);
  const [selectedStrategyKey, setSelectedStrategyKey] = useState<StrategyKey>('balanced');
  const [customReturnRate, setCustomReturnRate] = useState<number>(7.0);

  // Custom Products for Recommendation Tab
  const [customProducts, setCustomProducts] = useState<ProductReturnItem[]>(
    STRATEGY_DEFINITIONS.balanced.products
  );

  // Sync products when strategy changes (unless in custom mode with edits)
  const handleSelectStrategy = (key: StrategyKey) => {
    setSelectedStrategyKey(key);
    if (key !== 'custom') {
      const def = STRATEGY_DEFINITIONS[key];
      setCustomProducts(def.products);
      setCustomReturnRate(def.expectedReturnRate);
    }
  };

  // Effective Return Rate (% p.a.)
  const effectiveReturnRate = useMemo(() => {
    if (selectedStrategyKey === 'custom') {
      return customReturnRate;
    }
    return STRATEGY_DEFINITIONS[selectedStrategyKey]?.expectedReturnRate || 7.0;
  }, [selectedStrategyKey, customReturnRate]);

  // Annual contribution
  const annualContribution = monthlyContribution * 12;

  // Total Invested Principal over time horizon
  const totalPrincipalInvested = useMemo(() => {
    return startingBalance + annualContribution * timeHorizonYears;
  }, [startingBalance, annualContribution, timeHorizonYears]);

  // Step 4 Simplified Projection Table Calculations:
  // Starting Balance → Annual Contribution → Expected Return → End Balance
  const projectionTimeline = useMemo(() => {
    const rows = [];
    let currentStartBalance = startingBalance;
    const r = effectiveReturnRate / 100;

    for (let yr = 1; yr <= timeHorizonYears; yr++) {
      const start = currentStartBalance;
      const contrib = annualContribution;
      // Standard annual compounding with intra-year contribution averaging:
      // (Start + Contrib / 2) * rate
      const expectedReturn = Math.round((start + contrib / 2) * r * 100) / 100;
      const end = Math.round((start + contrib + expectedReturn) * 100) / 100;

      rows.push({
        year: yr,
        startingBalance: start,
        annualContribution: contrib,
        expectedReturn: expectedReturn,
        endBalance: end,
        cumulativeInvested: startingBalance + contrib * yr,
        cumulativeGains: Math.max(0, end - (startingBalance + contrib * yr))
      });

      currentStartBalance = end;
    }

    return rows;
  }, [startingBalance, annualContribution, timeHorizonYears, effectiveReturnRate]);

  // Projected Future Wealth (Final End Balance)
  const projectedFutureWealth = useMemo(() => {
    if (projectionTimeline.length === 0) return startingBalance;
    return projectionTimeline[projectionTimeline.length - 1].endBalance;
  }, [projectionTimeline, startingBalance]);

  // Funding Percentage
  const fundingPercent = useMemo(() => {
    if (targetGoalAmount <= 0) return 100;
    return Math.round((projectedFutureWealth / targetGoalAmount) * 100);
  }, [projectedFutureWealth, targetGoalAmount]);

  // Status Badge Logic and Exact Status Wording
  const goalStatus = useMemo(() => {
    if (fundingPercent >= 100) {
      return {
        statusText: `🎉 Mission Achievable (${fundingPercent}% Funded)`,
        badgeBg: 'bg-emerald-50',
        badgeBorder: 'border-emerald-200',
        badgeText: 'text-emerald-700',
        accentColor: '#059669',
        icon: CheckCircle2,
        recommendation: `Congratulations! Your projected wealth of RM ${projectedFutureWealth.toLocaleString()} exceeds your target of RM ${targetGoalAmount.toLocaleString()} by RM ${(projectedFutureWealth - targetGoalAmount).toLocaleString()}.`
      };
    } else if (fundingPercent >= 70) {
      return {
        statusText: `💪 On Your Way (${fundingPercent}% Funded)`,
        badgeBg: 'bg-amber-50',
        badgeBorder: 'border-amber-200',
        badgeText: 'text-amber-700',
        accentColor: '#D97706',
        icon: TrendingUp,
        recommendation: `You are well on your way! A modest boost of RM ${(Math.max(0, (targetGoalAmount - projectedFutureWealth) / (timeHorizonYears * 12))).toFixed(0)}/month or extending by ${(1 - fundingPercent / 100) * 3 < 1 ? '1' : Math.round((1 - fundingPercent / 100) * 3)} years will close the gap.`
      };
    } else {
      return {
        statusText: `🚨 Mission Not Achievable (${fundingPercent}% Funded)`,
        badgeBg: 'bg-rose-50',
        badgeBorder: 'border-rose-200',
        badgeText: 'text-rose-700',
        accentColor: '#E11D48',
        icon: AlertTriangle,
        recommendation: `Action required: There is a shortfall of RM ${(targetGoalAmount - projectedFutureWealth).toLocaleString()}. Consider adjusting your monthly contribution, choosing a higher-yielding growth strategy, or extending your time horizon.`
      };
    }
  }, [fundingPercent, projectedFutureWealth, targetGoalAmount, timeHorizonYears]);

  // Gap Calculations
  const gapAmount = projectedFutureWealth - targetGoalAmount;
  const totalCompoundedGains = Math.max(0, projectedFutureWealth - totalPrincipalInvested);

  // Required Monthly Contribution to reach 100% Target
  const requiredMonthlyContribution = useMemo(() => {
    if (timeHorizonYears <= 0) return 0;
    const r = effectiveReturnRate / 100;
    if (r <= 0) {
      return Math.max(0, Math.round((targetGoalAmount - startingBalance) / (timeHorizonYears * 12)));
    }
    const compoundFactor = Math.pow(1 + r, timeHorizonYears);
    const futureValueOfStart = startingBalance * compoundFactor;
    const remainingNeeded = targetGoalAmount - futureValueOfStart;
    if (remainingNeeded <= 0) return 0;

    const annuityFactor = (compoundFactor - 1) / r;
    const annualContribReq = remainingNeeded / annuityFactor;
    return Math.max(0, Math.round(annualContribReq / 12));
  }, [targetGoalAmount, startingBalance, timeHorizonYears, effectiveReturnRate]);

  // Auto-pull starting balance from user's current wealth
  const handleAutoPullCurrentWealth = () => {
    let currentDecPrincipal = 0;
    passiveAccounts.forEach(acc => {
      if (acc.principalAmount > 0) currentDecPrincipal += acc.principalAmount;
    });
    if (currentDecPrincipal > 0) {
      setStartingBalance(currentDecPrincipal);
    } else if (holdings.length > 0) {
      const stockVal = holdings.reduce((sum, h) => sum + h.units * (h.currentUnitPrice || h.buyUnitPrice), 0);
      setStartingBalance(Math.round(stockVal));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER & 4-STEP NAVIGATION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 bg-blue-50 text-blue-700 font-mono font-bold text-sm sm:text-base rounded-full border border-blue-200 uppercase tracking-wider">
            FIRE Goal Planner
          </span>
        </div>

        {/* 5-STEP PROGRESSIVE NAVIGATION FLOW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {[
            { id: 'goal', step: '1', title: 'Goal Setting', icon: Target },
            { id: 'position', step: '2', title: 'Current Position', icon: Wallet },
            { id: 'gap', step: '3', title: 'Gap Analysis', icon: Scale },
            { id: 'recommendation', step: '4', title: 'Recommendation Plan', icon: Sparkles },
            { id: 'projection', step: '5', title: 'Show Projection', icon: LineChart }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CalculatorTab)}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                  isActive
                    ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                    Step {tab.step}
                  </div>
                  <div className={`text-xs sm:text-sm font-bold truncate ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {tab.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: GOAL SETTING VIEW */}
      {activeTab === 'goal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form Parameters */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                      Step 1: Goal Setting
                    </h2>
                    <p className="text-xs text-gray-500">
                      Set the financial target and timeline for your milestone journey.
                    </p>
                  </div>
                </div>
              </div>

              {/* Goal Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Target Goal */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>Target Goal (RM)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RM</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={targetGoalAmount ? targetGoalAmount.toLocaleString('en-US') : ''}
                      onChange={e => {
                        const clean = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                        setTargetGoalAmount(clean === '' ? 0 : Math.max(0, parseInt(clean, 10) || 0));
                      }}
                      placeholder="0"
                      className="w-full pl-11 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Time Horizon */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>Time Horizon (Years)</span>
                    <span className="font-mono text-xs font-bold text-blue-600">{timeHorizonYears} Years</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={1}
                      max={40}
                      step={1}
                      value={timeHorizonYears}
                      onChange={e => setTimeHorizonYears(Number(e.target.value))}
                      className="grow accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={timeHorizonYears}
                      onChange={e => setTimeHorizonYears(Math.max(1, Number(e.target.value)))}
                      className="w-16 px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-center text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Action */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setActiveTab('position')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Next: Assess Current Position</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Instant Result Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-5">
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                Goal Setting Summary
              </h3>

              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200/60">
                  <span className="text-gray-500">Milestone Target:</span>
                  <span className="font-mono font-black text-sm text-gray-900">RM {targetGoalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200/60">
                  <span className="text-gray-500">Target Timeframe:</span>
                  <span className="font-mono font-bold text-blue-600">{timeHorizonYears} Years</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-gray-500">Target Year:</span>
                  <span className="font-mono font-bold text-gray-900">{new Date().getFullYear() + timeHorizonYears}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-1.5 leading-relaxed">
                <div className="font-bold text-blue-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>Next Step</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  In the next step, input your existing capital or sync live balances from your passive accounts and stock portfolios to evaluate your current trajectory.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CURRENT POSITION VIEW */}
      {activeTab === 'position' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Current Capital & Savings Inputs */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                      Step 2: Current Position
                    </h2>
                    <p className="text-xs text-gray-500">
                      Input your starting capital and planned regular contributions, or sync with your live portfolio data.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAutoPullCurrentWealth}
                  className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                  title="Auto-fill starting balance from Cash Flow Passive principal / Stock Portfolio"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Use Live Wealth Data</span>
                </button>
              </div>

              {/* Capital & Contribution Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Starting Balance */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>Starting Balance / Capital (RM)</span>
                    <span className="text-[10px] text-gray-400">Existing assets</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RM</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={startingBalance ? startingBalance.toLocaleString('en-US') : ''}
                      onChange={e => {
                        const clean = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                        setStartingBalance(clean === '' ? 0 : Math.max(0, parseInt(clean, 10) || 0));
                      }}
                      placeholder="0"
                      className="w-full pl-11 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Monthly Contribution */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>Monthly Savings / DCA (RM/mo)</span>
                    <span className="text-[10px] text-gray-400">RM {(monthlyContribution * 12).toLocaleString()}/yr</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">RM</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={monthlyContribution ? monthlyContribution.toLocaleString('en-US') : ''}
                      onChange={e => {
                        const clean = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                        setMonthlyContribution(clean === '' ? 0 : Math.max(0, parseInt(clean, 10) || 0));
                      }}
                      placeholder="0"
                      className="w-full pl-11 pr-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Investment Strategy Selection & Return Assumption */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="text-xs font-extrabold text-gray-900 uppercase tracking-wider block">
                  Current Expected Return Rate Assumption
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['conservative', 'balanced', 'growth'] as StrategyKey[]).map(key => {
                    const strat = STRATEGY_DEFINITIONS[key];
                    const isSelected = selectedStrategyKey === key;
                    const Icon = strat.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectStrategy(key)}
                        className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                          isSelected
                            ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                            : 'bg-gray-50/60 border-gray-200 hover:bg-white'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600" />
                        )}
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-gray-900">{strat.name}</span>
                        </div>
                        <div className="text-base font-extrabold font-mono text-gray-900">
                          {strat.expectedReturnRate.toFixed(2)}% <span className="text-[10px] text-gray-500 font-normal">p.a.</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1.5 leading-snug line-clamp-2">
                          {strat.riskDescription}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Rate Slider */}
                <div className="pt-2">
                  <button
                    onClick={() => handleSelectStrategy('custom')}
                    className={`text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                      selectedStrategyKey === 'custom' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span>Or set custom annual expected yield</span>
                    {selectedStrategyKey === 'custom' && <span className="font-mono text-xs text-blue-600">({customReturnRate}% p.a.)</span>}
                  </button>
                  {selectedStrategyKey === 'custom' && (
                    <div className="mt-3 p-4 bg-white rounded-2xl border border-gray-200 flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={25}
                        step={0.25}
                        value={customReturnRate}
                        onChange={e => setCustomReturnRate(Number(e.target.value))}
                        className="grow accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
                      />
                      <span className="font-mono font-extrabold text-sm text-gray-900 w-16 text-right">
                        {customReturnRate.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation Action */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setActiveTab('goal')}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  ← Back: Goal Setting
                </button>
                <button
                  onClick={() => setActiveTab('gap')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <span>Next: Analyze Goal Gap</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Current Position Snapshot */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-5">
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                Position Snapshot
              </h3>

              <div className={`p-4 rounded-2xl border ${goalStatus.badgeBg} ${goalStatus.badgeBorder}`}>
                <div className="text-xs font-black tracking-tight">{goalStatus.statusText}</div>
                <div className="w-full bg-black/10 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, fundingPercent)}%`,
                      backgroundColor: goalStatus.accentColor
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-600 mt-2.5 leading-relaxed">
                  {goalStatus.recommendation}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Target Goal:</span>
                  <span className="font-mono font-bold text-gray-900">RM {targetGoalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Starting Capital:</span>
                  <span className="font-mono font-bold text-gray-900">RM {startingBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Total Invested Principal:</span>
                  <span className="font-mono font-medium text-gray-600">RM {totalPrincipalInvested.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100">
                  <span className="text-gray-500">Projected Future Wealth:</span>
                  <span className="font-mono font-black text-sm text-gray-900">RM {projectedFutureWealth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-gray-500">Estimated Compounded Growth:</span>
                  <span className="font-mono font-bold text-emerald-600">+RM {totalCompoundedGains.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CALCULATE GAP VIEW */}
      {activeTab === 'gap' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Step 3: Gap Analysis
                  </h2>
                  <p className="text-xs text-gray-500">
                    Detailed breakdown between your target goal and projected wealth outcome over {timeHorizonYears} years.
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className={`px-4 py-2 rounded-xl border font-bold text-xs ${goalStatus.badgeBg} ${goalStatus.badgeBorder} ${goalStatus.badgeText}`}>
                {goalStatus.statusText}
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Projected Wealth */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Future Portfolio Value
                </span>
                <div className="text-2xl font-black font-mono text-gray-900">
                  RM {projectedFutureWealth.toLocaleString()}
                </div>
              </div>

              {/* Card 2: Funding Gap / Surplus */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {gapAmount >= 0 ? 'Surplus Beyond Goal' : 'Funding Deficit (Gap)'}
                </span>
                <div className={`text-2xl font-black font-mono ${gapAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {gapAmount >= 0 ? '+' : '-'}RM {Math.abs(gapAmount).toLocaleString()}
                </div>
              </div>

              {/* Card 3: Required Monthly Contribution */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Required Monthly Savings
                </span>
                <div className="text-2xl font-black font-mono text-blue-600">
                  RM {requiredMonthlyContribution.toLocaleString()}{' '}
                  <span className="text-xs font-normal text-gray-500">/mo</span>
                </div>
              </div>
            </div>

            {/* Visual Gap Comparison Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4">
              <h3 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase">
                Goal vs Projected Wealth Trajectory
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [`RM ${Number(val).toLocaleString()}`, name]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="cumulativeInvested"
                      name="Invested Principal"
                      stackId="1"
                      stroke="#94A3B8"
                      fill="#CBD5E1"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeGains"
                      name="Compounded Yield Gains"
                      stackId="1"
                      stroke="#059669"
                      fill="#10B981"
                      fillOpacity={0.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setActiveTab('position')}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                ← Back: Current Position
              </button>
              <button
                onClick={() => setActiveTab('recommendation')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>Next: View Recommendation Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: RECOMMENDATION PLAN VIEW */}
      {activeTab === 'recommendation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Step 4: Recommendation Plan
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                  Target: RM {targetGoalAmount.toLocaleString()} by {new Date().getFullYear() + timeHorizonYears} ({timeHorizonYears} yrs)
                </div>
                <div className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                  Active: {effectiveReturnRate.toFixed(2)}% p.a.
                </div>
              </div>
            </div>

            {/* 3 Strategy Archetypes Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-7">
              {(['conservative', 'balanced', 'growth'] as StrategyKey[]).map(key => {
                const strat = STRATEGY_DEFINITIONS[key];
                const isSelected = selectedStrategyKey === key;
                const Icon = strat.icon;

                // Calculate required monthly DCA for this specific strategy
                const r = strat.expectedReturnRate / 100;
                let reqMonthlyForStrat = 0;
                if (timeHorizonYears > 0) {
                  if (r <= 0) {
                    reqMonthlyForStrat = Math.max(0, (targetGoalAmount - startingBalance) / (timeHorizonYears * 12));
                  } else {
                    const compoundFactor = Math.pow(1 + r, timeHorizonYears);
                    const futureValueOfStart = startingBalance * compoundFactor;
                    const remainingNeeded = targetGoalAmount - futureValueOfStart;
                    if (remainingNeeded > 0) {
                      const annuityFactor = (compoundFactor - 1) / r;
                      const annualContribReq = remainingNeeded / annuityFactor;
                      reqMonthlyForStrat = Math.max(0, annualContribReq / 12);
                    }
                  }
                }

                return (
                  <div
                    key={key}
                    className={`rounded-3xl border p-6 sm:p-7 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-blue-500 shadow-lg ring-2 ring-blue-500/20'
                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-xs'
                    }`}
                  >
                    <div className="space-y-5 sm:space-y-6">
                      {/* Header: Line 1 (Icon & Top-Right Percentage) | Line 2 (Strategy Name) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="font-mono text-sm sm:text-base font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-xl border border-gray-200">
                            {strat.expectedReturnRate.toFixed(2)}%
                          </div>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                          {strat.name}
                        </h3>
                      </div>

                      {/* Strategy Description */}
                      <p className="text-xs sm:text-[13px] text-gray-600 leading-relaxed min-h-[40px]">
                        {strat.riskDescription}
                      </p>

                      {/* Required Monthly DCA Box */}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-4.5">
                        <div className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider mb-1.5">
                          Required Monthly DCA
                        </div>
                        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                          <span className="font-mono font-black text-xl sm:text-2xl text-blue-700 tracking-tight whitespace-nowrap">
                            RM {reqMonthlyForStrat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-bold text-blue-600">/mo</span>
                        </div>
                      </div>

                      {/* Asset Allocation Breakdown */}
                      <div className="pt-4 border-t border-gray-100 space-y-3.5">
                        <span className="text-[11px] font-extrabold uppercase text-gray-500 tracking-wider block">
                          Asset Allocation
                        </span>
                        <div className="space-y-3">
                          {strat.assetAllocation.map((item, i) => (
                            <div key={i} className="space-y-1.5 bg-gray-50/70 rounded-xl p-3 border border-gray-100">
                              <div className="flex justify-between items-center text-xs sm:text-[13px] font-bold text-gray-900">
                                <span className="truncate pr-2">{item.name}</span>
                                <span className="font-mono font-extrabold text-blue-600 shrink-0">{item.percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                                />
                              </div>
                              <div className="flex justify-end pt-0.5">
                                <span className="text-[10px] font-medium text-gray-400 tracking-tight">
                                  Est. {item.expectedYield} p.a.
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Action Button */}
                    <div className="pt-5 mt-6 border-t border-gray-100">
                      <button
                        onClick={() => handleSelectStrategy(key)}
                        className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? '✓ Currently Selected' : `Select ${strat.name}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setActiveTab('gap')}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                ← Back: Calculate Gap
              </button>
              <button
                onClick={() => setActiveTab('projection')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>Next: View Projection Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: SIMPLIFIED PROJECTION PLAN VIEW */}
      {activeTab === 'projection' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <LineChart className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">
                    Step 5: Show Projection
                  </h2>
                </div>
              </div>

              {/* Status Pill */}
              <div className={`px-4 py-2 rounded-xl border font-bold text-xs ${goalStatus.badgeBg} ${goalStatus.badgeBorder} ${goalStatus.badgeText}`}>
                {goalStatus.statusText}
              </div>
            </div>

            {/* Visual Growth Chart */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase">
                  Annual Portfolio Trajectory ({effectiveReturnRate}% p.a.)
                </h3>
                <div className="text-[10px] font-mono text-gray-400">
                  Values in (RM)
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={projectionTimeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [`RM ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="startingBalance" name="Starting Balance" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expectedReturn" name="Annual Return" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="endBalance" name="End Balance" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SIMPLIFIED PROJECTION TABLE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase">
                  SIMPLIFIED PROJECTION TABLE
                </h3>
                <span className="text-[10px] font-mono text-gray-500">
                  Rate: {effectiveReturnRate.toFixed(2)}% p.a.
                </span>
              </div>

              <div className="overflow-x-auto no-scrollbar touch-scroll">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">YEAR</th>
                      <th className="py-3 px-4 text-right">STARTING BALANCE</th>
                      <th className="py-3 px-4 text-right">ANNUAL CONTRIBUTION</th>
                      <th className="py-3 px-4 text-right">EXPECTED RETURN</th>
                      <th className="py-3 px-4 text-right">END BALANCE</th>
                      <th className="py-3 px-4 text-right">GOAL PROGRESS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                    {projectionTimeline.map(row => {
                      const rowProgress = targetGoalAmount > 0 ? (row.endBalance / targetGoalAmount) * 100 : 100;
                      return (
                        <tr key={row.year} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3 px-4 font-bold text-gray-900">
                            Year {row.year}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-gray-600">
                            RM {row.startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-blue-600">
                            +RM {row.annualContribution.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            +RM {row.expectedReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-gray-900">
                            RM {row.endBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            <span className={rowProgress >= 100 ? 'text-emerald-600' : rowProgress >= 70 ? 'text-blue-600' : 'text-gray-500'}>
                              {rowProgress.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold text-gray-900 border-t-2 border-gray-200">
                      <td className="py-3 px-4 font-extrabold text-xs uppercase">
                        Final Total ({timeHorizonYears}Y)
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-gray-600">
                        RM {startingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-blue-600">
                        RM {(annualContribution * timeHorizonYears).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-emerald-600">
                        RM {totalCompoundedGains.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-black text-gray-900">
                        RM {projectedFutureWealth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sm font-black text-blue-600">
                        {((projectedFutureWealth / (targetGoalAmount || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Navigation Action */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => setActiveTab('recommendation')}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                ← Back: Recommendation Plan
              </button>
              <button
                onClick={() => setActiveTab('goal')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <span>Edit Goal Parameters</span>
                <Target className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
