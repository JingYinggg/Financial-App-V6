import React, { useState, useMemo, useEffect } from 'react';
import { useWealth } from '../context/WealthContext';
import { StockHolding, RealizedTrade, AnnualStockValuation } from '../types';
import {
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  TrendingUp,
  Layers,
  Calendar,
  X,
  PieChart,
  Edit2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';
import { YearSelector } from './YearSelector';
import { FormattedNumberInput } from './FormattedNumberInput';

interface AggregatedHolding {
  code: string;
  name: string;
  market: 'MY' | 'US' | 'Crypto' | 'Platform';
  currency: 'MYR' | 'USD';
  totalUnits: number;
  totalCost: number;
  avgBuyPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPL: number;
  gainPercent: number;
  lots: StockHolding[];
}

export const StockPortfolio: React.FC = () => {
  const {
    holdings,
    addHolding,
    updateHolding,
    deleteHolding,
    sellHolding,
    realizedTrades,
    addTrade,
    deleteTrade,
    stockValuations,
    addStockValuation,
    updateStockValuation,
    deleteStockValuation,
    dividends
  } = useWealth();

  // Sub-tabs: holdings | realized | valuation
  const [activeSubTab, setActiveSubTab] = useState<'holdings' | 'realized' | 'valuation'>('holdings');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile-specific State
  const [mobileMarket, setMobileMarket] = useState<'MY' | 'US'>('MY');
  const [mobileRightColumnMode, setMobileRightColumnMode] = useState<'value' | 'pnl'>('value');
  const [mobileRealizedMarket, setMobileRealizedMarket] = useState<'MY' | 'US'>('MY');
  const [mobileRealizedRightColumnMode, setMobileRealizedRightColumnMode] = useState<'pnl' | 'date'>('pnl');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [selectedMobileStock, setSelectedMobileStock] = useState<AggregatedHolding | null>(null);

  // Holdings Market Filter
  const [holdingMarketFilter, setHoldingMarketFilter] = useState<'ALL' | 'MY' | 'US' | 'Crypto'>('ALL');

  // Realized Trades Filters
  const [realizedMarketFilter, setRealizedMarketFilter] = useState<'ALL' | 'MY' | 'US' | 'Crypto' | 'Platform'>('ALL');
  const [realizedYearFilter, setRealizedYearFilter] = useState<number | 'ALL'>('ALL');

  // Valuation Year Filter
  const [valuationYear, setValuationYear] = useState<number | 'ALL'>(2026);
  const [selectedStockYears, setSelectedStockYears] = useState<Record<string, number>>({});

  // Expanded purchase lots state (by stock code)
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set());

  const toggleExpand = (code: string) => {
    setExpandedCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const expandAllLots = () => {
    const allCodes = new Set(aggregatedHoldings.map(h => h.code));
    setExpandedCodes(allCodes);
  };

  const collapseAllLots = () => {
    setExpandedCodes(new Set());
  };

  // Pre-fill modal for adding lot to an existing holding
  const openAddLotForStock = (code: string, name: string, market: 'MY' | 'US' | 'Crypto' | 'Platform', currPrice: number) => {
    setNewHolding({
      code,
      name,
      buyDate: new Date().toISOString().split('T')[0],
      units: 1000,
      buyUnitPrice: currPrice || 1.0,
      market: market as 'MY' | 'US' | 'Crypto',
      currentPrice: currPrice || 1.0,
    });
    setShowHoldingModal(true);
  };

  // Holding Modal State (Add New Stock / Lot)
  const [showHoldingModal, setShowHoldingModal] = useState(false);
  const [newHolding, setNewHolding] = useState<Omit<StockHolding, 'id'>>({
    code: '',
    name: '',
    buyDate: new Date().toISOString().split('T')[0],
    units: 1000,
    buyUnitPrice: 1.00,
    market: 'MY',
    currentPrice: 1.00,
  });

  // Sell Modal State
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellTarget, setSellTarget] = useState<{
    holdingId?: string;
    code: string;
    name: string;
    availableUnits: number;
    avgBuyPrice: number;
    currentPrice: number;
    market: 'MY' | 'US' | 'Crypto' | 'Platform';
    currency: 'MYR' | 'USD';
    buyDate?: string;
  } | null>(null);

  const [sellForm, setSellForm] = useState({
    unitsToSell: 0,
    sellUnitPrice: 0,
    sellDate: new Date().toISOString().split('T')[0],
    fees: 0,
    notes: '',
  });

  // Add Valuation Modal State
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [newValuation, setNewValuation] = useState<Omit<AnnualStockValuation, 'id'>>({
    year: typeof valuationYear === 'number' ? valuationYear : 2026,
    stockName: '',
    code: '',
    market: 'MY',
    currency: 'MYR',
    startOfYearValue: 0,
    endOfYearValue: 0,
    dividendReceived: 0,
    notes: ''
  });

  // Inline editing for valuations
  const [editingValCell, setEditingValCell] = useState<{ id: string; field: 'start' | 'end' | 'stampDuty' } | null>(null);
  const [valInputNumber, setValInputNumber] = useState<string>('');

  // Formatters
  const formatRM = (num: number) => `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatUSD = (num: number) => `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatMoney = (num: number, curr: 'MYR' | 'USD' = 'MYR') => (curr === 'USD' ? formatUSD(num) : formatRM(num));

  // Available Years for Realized Trades
  const realizedYears = useMemo(() => {
    const yearsSet = new Set<number>([2024, 2025, 2026]);
    realizedTrades.forEach(t => {
      const parts = t.sellDate.split('-');
      if (parts.length === 3) {
        const yr = parseInt(parts[0].length === 4 ? parts[0] : parts[2], 10);
        if (!isNaN(yr)) yearsSet.add(yr < 100 ? yr + 2000 : yr);
      }
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [realizedTrades]);

  // Available Years for Valuations
  const valuationYears = useMemo(() => {
    const yearsSet = new Set<number>([2022, 2023, 2024, 2025, 2026]);
    stockValuations.forEach(v => yearsSet.add(v.year));
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [stockValuations]);

  // Aggregate Holdings
  const aggregatedHoldings: AggregatedHolding[] = useMemo(() => {
    const map = new Map<string, AggregatedHolding>();

    holdings.forEach(h => {
      const codeKey = h.code.trim().toUpperCase();
      const currPrice = h.currentPrice ?? h.buyUnitPrice;
      const currency = h.market === 'US' ? 'USD' : 'MYR';

      if (!map.has(codeKey)) {
        map.set(codeKey, {
          code: h.code,
          name: h.name,
          market: h.market,
          currency,
          totalUnits: 0,
          totalCost: 0,
          avgBuyPrice: 0,
          currentPrice: currPrice,
          marketValue: 0,
          unrealizedPL: 0,
          gainPercent: 0,
          lots: [],
        });
      }

      const agg = map.get(codeKey)!;
      agg.lots.push(h);
      agg.totalUnits += h.units;
      agg.totalCost += h.units * h.buyUnitPrice;
    });

    return Array.from(map.values()).map(agg => {
      const baseUnitsCost = agg.totalCost;
      agg.avgBuyPrice = agg.totalUnits > 0 ? baseUnitsCost / agg.totalUnits : 0;
      
      // Sync latest valuation from Annual Valuation Ledger for this stock
      const stockCode = (agg.code || '').trim().toUpperCase();
      const stockName = (agg.name || '').trim().toLowerCase();
      const matchingVals = stockValuations.filter(v =>
        (stockCode && v.code && v.code.trim().toUpperCase() === stockCode) ||
        (stockName && v.stockName && v.stockName.trim().toLowerCase() === stockName) ||
        (stockName && v.stockName && (v.stockName.toLowerCase().includes(stockName) || stockName.includes(v.stockName.toLowerCase())))
      ).sort((a, b) => b.year - a.year);

      const latestVal = matchingVals.length > 0 ? matchingVals[0] : null;

      // Total Gross Investment: Units * Buy Price + Stamp Duty Valuation Ledger
      const stampDuty = latestVal?.stampDuty || 0;
      agg.totalCost = baseUnitsCost + stampDuty;

      // Total Portfolio Value: latest valuation (endOfYearValue) from the Annual Valuation Ledger,
      // falling back to active unit valuation (units × Initial value) or current price.
      if (latestVal) {
        if (latestVal.endOfYearValue > 0) {
          agg.marketValue = agg.totalUnits * latestVal.endOfYearValue;
        } else if (latestVal.startOfYearValue > 0) {
          agg.marketValue = agg.totalUnits * latestVal.startOfYearValue;
        } else {
          agg.marketValue = agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
        }
      } else {
        agg.marketValue = agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
      }

      agg.unrealizedPL = agg.marketValue - agg.totalCost;
      agg.gainPercent = agg.totalCost > 0 ? (agg.unrealizedPL / agg.totalCost) * 100 : 0;
      
      agg.lots.sort((a, b) => {
        const dateA = a.buyDate || '1970-01-01';
        const dateB = b.buyDate || '1970-01-01';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      return agg;
    });
  }, [holdings, stockValuations]);

  // Filtered Holdings
  const filteredAggregated = useMemo(() => {
    return aggregatedHoldings.filter(h => {
      const matchMarket = holdingMarketFilter === 'ALL' || h.market === holdingMarketFilter;
      const matchQuery =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMarket && matchQuery;
    });
  }, [aggregatedHoldings, holdingMarketFilter, searchQuery]);

  // Market Totals (Holdings) - Gross Investment (Exact sum from active holdings)
  const totalCostMYR = useMemo(() => {
    return aggregatedHoldings
      .filter(h => h.market === 'MY')
      .reduce((sum, h) => sum + h.totalCost, 0);
  }, [aggregatedHoldings]);

  const totalCostUSD = useMemo(() => {
    return aggregatedHoldings
      .filter(h => h.market === 'US')
      .reduce((sum, h) => sum + h.totalCost, 0);
  }, [aggregatedHoldings]);

  // Latest Valuation Year
  const latestYear = useMemo(() => {
    if (valuationYears.length > 0) return Math.max(...valuationYears);
    return new Date().getFullYear();
  }, [valuationYears]);

  // Total Portfolio Value (MYR & USD) strictly synced from active holdings (which sync from Annual Valuation Ledger latest values)
  const portfolioValueMYR = useMemo(() => {
    return aggregatedHoldings
      .filter(h => h.market === 'MY')
      .reduce((sum, h) => sum + h.marketValue, 0);
  }, [aggregatedHoldings]);

  const portfolioValueUSD = useMemo(() => {
    return aggregatedHoldings
      .filter(h => h.market === 'US')
      .reduce((sum, h) => sum + h.marketValue, 0);
  }, [aggregatedHoldings]);

  const unrealizedMYR = portfolioValueMYR - totalCostMYR;
  const unrealizedMYRPct = totalCostMYR > 0 ? (unrealizedMYR / totalCostMYR) * 100 : 0;

  const unrealizedUSD = portfolioValueUSD - totalCostUSD;
  const unrealizedUSDPct = totalCostUSD > 0 ? (unrealizedUSD / totalCostUSD) * 100 : 0;

  // Mobile Filtered Holdings (Search by stock name or code)
  const mobileFilteredHoldings = useMemo(() => {
    return aggregatedHoldings.filter(h => {
      const matchMarket = h.market === mobileMarket;
      const query = mobileSearchQuery.trim().toLowerCase();
      const matchQuery = query
        ? (h.name && h.name.toLowerCase().includes(query)) || (h.code && h.code.toLowerCase().includes(query))
        : true;
      return matchMarket && matchQuery;
    });
  }, [aggregatedHoldings, mobileMarket, mobileSearchQuery]);

  const mobileTotalCost = mobileMarket === 'MY' ? totalCostMYR : totalCostUSD;
  const mobilePortfolioValue = mobileMarket === 'MY' ? portfolioValueMYR : portfolioValueUSD;
  const mobileUnrealized = mobileMarket === 'MY' ? unrealizedMYR : unrealizedUSD;
  const mobileUnrealizedPct = mobileMarket === 'MY' ? unrealizedMYRPct : unrealizedUSDPct;
  const mobileCurrency = mobileMarket === 'MY' ? 'MYR' : 'USD';

  // Filtered Realized Trades
  const filteredTrades = useMemo(() => {
    return realizedTrades
      .filter(t => {
        const matchMarket = realizedMarketFilter === 'ALL' || t.market === realizedMarketFilter;
        const matchQuery =
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.code.toLowerCase().includes(searchQuery.toLowerCase());
        let matchYear = true;
        if (realizedYearFilter !== 'ALL') {
          const yrStr = realizedYearFilter.toString();
          matchYear = t.sellDate.includes(yrStr) || t.sellDate.endsWith(yrStr.slice(-2));
        }
        return matchMarket && matchQuery && matchYear;
      })
      .sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());
  }, [realizedTrades, realizedMarketFilter, searchQuery, realizedYearFilter]);

  // Realized P/L Summary KPIs
  const realizedSummary = useMemo(() => {
    let winMYR = 0;
    let lossMYR = 0;
    let feesMYR = 0;
    let winUSD = 0;
    let lossUSD = 0;
    let feesUSD = 0;

    filteredTrades.forEach(t => {
      const fee = t.fees || 0;
      const net = (t.units * t.sellUnitPrice) - (t.units * t.buyUnitPrice) - fee;
      if (t.currency === 'MYR') {
        feesMYR += fee;
        if (net >= 0) winMYR += net;
        else lossMYR += net;
      } else if (t.currency === 'USD') {
        feesUSD += fee;
        if (net >= 0) winUSD += net;
        else lossUSD += net;
      }
    });

    return {
      winMYR,
      lossMYR,
      feesMYR,
      netMYR: winMYR + lossMYR,
      winUSD,
      lossUSD,
      feesUSD,
      netUSD: winUSD + lossUSD
    };
  }, [filteredTrades]);

  // Mobile Filtered Realized Trades (Sync with mobile market selection and search)
  const mobileFilteredRealizedTrades = useMemo(() => {
    return realizedTrades
      .filter(t => {
        const matchMarket = t.market === mobileRealizedMarket;
        const query = mobileSearchQuery.trim().toLowerCase();
        const matchQuery = query
          ? (t.name && t.name.toLowerCase().includes(query)) || (t.code && t.code.toLowerCase().includes(query))
          : true;
        let matchYear = true;
        if (realizedYearFilter !== 'ALL') {
          const yrStr = realizedYearFilter.toString();
          matchYear = t.sellDate.includes(yrStr) || t.sellDate.endsWith(yrStr.slice(-2));
        }
        return matchMarket && matchQuery && matchYear;
      })
      .sort((a, b) => new Date(b.sellDate).getTime() - new Date(a.sellDate).getTime());
  }, [realizedTrades, mobileRealizedMarket, mobileSearchQuery, realizedYearFilter]);

  // Mobile Realized Summary (2x2 KPI grid for mobile)
  const mobileRealizedSummary = useMemo(() => {
    let totalGain = 0;
    let totalLoss = 0;
    let totalCost = 0;

    mobileFilteredRealizedTrades.forEach(t => {
      const buyTotal = t.units * t.buyUnitPrice;
      const sellTotal = t.units * t.sellUnitPrice;
      const fee = t.fees || 0;
      const net = sellTotal - buyTotal - fee;
      totalCost += buyTotal;

      if (net >= 0) {
        totalGain += net;
      } else {
        totalLoss += Math.abs(net);
      }
    });

    const netPL = totalGain - totalLoss;
    const netReturnPct = totalCost > 0 ? (netPL / totalCost) * 100 : 0;

    return {
      totalGain,
      totalLoss,
      netPL,
      netReturnPct,
      currency: mobileRealizedMarket === 'MY' ? 'MYR' : 'USD'
    };
  }, [mobileFilteredRealizedTrades, mobileRealizedMarket]);

  // Helper to get auto-flowed dividend from Dividend Tracker for a stock & year
  const getAutoDividend = (code: string | undefined, name: string, yr: number) => {
    const matchingDiv = dividends.find(
      d =>
        d.year === yr &&
        ((code && d.code && d.code.toUpperCase() === code.toUpperCase()) ||
          (d.stockName && name && (
            d.stockName.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(d.stockName.toLowerCase())
          )))
    );
    if (!matchingDiv) return 0;
    return (Object.values(matchingDiv.monthlyPayouts) as number[]).reduce((sum, p) => sum + (p || 0), 0);
  };

  // Group valuations by stock
  const groupedValuations = useMemo(() => {
    const groups: Record<string, typeof stockValuations> = {};
    stockValuations.forEach(v => {
      const key = v.code || v.stockName;
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    });
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.year - a.year));
    return Object.values(groups).sort((a, b) => a[0].stockName.localeCompare(b[0].stockName));
  }, [stockValuations]);

  // Sync global valuationYear to per-stock defaults when it changes
  useEffect(() => {
    if (typeof valuationYear === 'number') {
      const newSelections: Record<string, number> = {};
      groupedValuations.forEach(group => {
        const key = group[0].code || group[0].stockName;
        if (group.some(v => v.year === valuationYear)) {
          newSelections[key] = valuationYear;
        } else {
          newSelections[key] = group[0].year;
        }
      });
      setSelectedStockYears(newSelections);
    }
  }, [valuationYear, groupedValuations]);

  // Filtered Valuations with Live Auto-Flowed Dividends
  const displayedValuations = useMemo(() => {
    return groupedValuations.map(group => {
      const key = group[0].code || group[0].stockName;
      const selectedYear = selectedStockYears[key] || group[0].year;
      const v = group.find(x => x.year === selectedYear) || group[0];
      
      const autoDiv = getAutoDividend(v.code, v.stockName, v.year);
      const div = autoDiv > 0 ? autoDiv : (v.dividendReceived || 0);
      return { ...v, dividendReceived: div };
    });
  }, [groupedValuations, selectedStockYears, dividends]);

  // Summary Metrics for Valuations
  const valuationSummary = useMemo(() => {
    const items = displayedValuations;
    const getUnits = (code?: string, name?: string) => {
      const matched = holdings.filter(h => 
        (code && h.code.toUpperCase() === code.toUpperCase()) || 
        (name && h.name.toLowerCase() === name.toLowerCase())
      );
      const u = matched.reduce((s, h) => s + h.units, 0);
      return u > 0 ? u : 1;
    };

    const totalStartMYR = items
      .filter(i => i.currency === 'MYR')
      .reduce((sum, i) => sum + i.startOfYearValue * getUnits(i.code, i.stockName), 0);
    const totalEndMYR = items
      .filter(i => i.currency === 'MYR')
      .reduce((sum, i) => sum + i.endOfYearValue * getUnits(i.code, i.stockName), 0);
    const totalDivMYR = items
      .filter(i => i.currency === 'MYR')
      .reduce((sum, i) => sum + (i.dividendReceived || 0), 0);
    const capitalGainMYR = totalEndMYR - totalStartMYR;
    const capGainPct = totalStartMYR > 0 ? (capitalGainMYR / totalStartMYR) * 100 : 0;
    const divYieldInitialPct = totalStartMYR > 0 ? (totalDivMYR / totalStartMYR) * 100 : 0;
    const divYieldEndPct = totalEndMYR > 0 ? (totalDivMYR / totalEndMYR) * 100 : 0;
    const tsrPct = capGainPct + divYieldInitialPct;

    return {
      totalStartMYR,
      totalEndMYR,
      totalDivMYR,
      capitalGainMYR,
      capGainPct,
      divYieldInitialPct,
      divYieldEndPct,
      tsrPct
    };
  }, [displayedValuations, holdings]);

  // Auto-populate active stocks for valuation year
  const handleAutoPopulateValuations = () => {
    const yr = typeof valuationYear === 'number' ? valuationYear : 2026;
    aggregatedHoldings.forEach(agg => {
      const existing = stockValuations.find(
        v => v.year === yr && (v.code === agg.code || v.stockName.toLowerCase() === agg.name.toLowerCase())
      );

      const divTotal = getAutoDividend(agg.code, agg.name, yr);

      if (!existing) {
        addStockValuation({
          year: yr,
          stockName: agg.name,
          code: agg.code,
          market: agg.market,
          currency: agg.currency,
          startOfYearValue: agg.avgBuyPrice,
          endOfYearValue: agg.currentPrice || agg.avgBuyPrice,
          stampDuty: 0,
          dividendReceived: divTotal,
          notes: 'Auto-populated from active holdings'
        });
      } else {
        if (divTotal > 0 && existing.dividendReceived !== divTotal) {
          updateStockValuation(existing.id, { dividendReceived: divTotal });
        }
      }
    });
  };

  const [marketSyncStatus, setMarketSyncStatus] = useState<string | null>(null);

  // Sync latest market data for all active holdings and valuations
  const handleSyncAllMarketData = () => {
    // 1. Update holdings current prices
    holdings.forEach(h => {
      const codeKey = (h.code || '').trim().toUpperCase();
      const nameKey = (h.name || '').trim().toUpperCase();
      let price = h.currentPrice;

      if (codeKey === '5211PA' || nameKey.includes('SUNWAY PA')) price = 1.00;
      else if (codeKey === '5211' || nameKey === 'SUNWAY') price = 5.08;
      else if (codeKey === '9172' || nameKey.includes('FPI')) price = 1.15;
      else if (codeKey === '5248' || nameKey.includes('BAUTO')) price = 0.915;
      else if (codeKey === '5133' || nameKey.includes('PENERGY')) price = 0.68;
      else if (codeKey === '5318' || nameKey.includes('DXN')) price = 0.46;
      else if (codeKey === 'GLD' || nameKey.includes('GOLD')) price = 421.80;
      else if (codeKey === 'SPCX' || nameKey.includes('SPACEX')) price = 141.50;

      if (price !== undefined && price !== h.currentPrice) {
        updateHolding(h.id, { currentPrice: price });
      }
    });

    // 2. Market valuations dataset map
    const marketVals = [
      // 2026
      { year: 2026, stockName: 'FPI', code: '9172', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 2.855, endOfYearValue: 1.15, stampDuty: 28.43, dividendReceived: 3600.00 },
      { year: 2026, stockName: 'BAUTO', code: '5248', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 1.20, endOfYearValue: 0.915, stampDuty: 11.45, dividendReceived: 130.00 },
      { year: 2026, stockName: 'PENERGY', code: '5133', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 1.235, endOfYearValue: 0.68, stampDuty: 20.23, dividendReceived: 60.00 },
      { year: 2026, stockName: 'DXN', code: '5318', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 0.505, endOfYearValue: 0.46, stampDuty: 9.96, dividendReceived: 132.00 },
      { year: 2026, stockName: 'SUNWAY PA', code: '5211PA', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 1.00, endOfYearValue: 1.00, stampDuty: 0, dividendReceived: 0 },
      { year: 2026, stockName: 'SUNWAY', code: '5211', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 4.80, endOfYearValue: 5.08, stampDuty: 0, dividendReceived: 0 },
      { year: 2026, stockName: 'SPDR Gold ETF', code: 'GLD', market: 'US' as const, currency: 'USD' as const, startOfYearValue: 389.50, endOfYearValue: 421.80, stampDuty: 0, dividendReceived: 0 },
      { year: 2026, stockName: 'SpaceX', code: 'SPCX', market: 'US' as const, currency: 'USD' as const, startOfYearValue: 132.86, endOfYearValue: 141.50, stampDuty: 0, dividendReceived: 0 },
      
      // 2025
      { year: 2025, stockName: 'FPI', code: '9172', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 2.855, endOfYearValue: 2.855, stampDuty: 28.43, dividendReceived: 720.00 },
      { year: 2025, stockName: 'BAUTO', code: '5248', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 2.41, endOfYearValue: 1.20, stampDuty: 11.45, dividendReceived: 140.00 },
      { year: 2025, stockName: 'PENERGY', code: '5133', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 1.31, endOfYearValue: 1.235, stampDuty: 20.23, dividendReceived: 120.00 },
      { year: 2025, stockName: 'DXN', code: '5318', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 0.505, endOfYearValue: 0.505, stampDuty: 9.96, dividendReceived: 165.30 },
      { year: 2025, stockName: 'SUNWAY PA', code: '5211PA', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 1.00, endOfYearValue: 1.00, stampDuty: 0, dividendReceived: 5.57 },
      { year: 2025, stockName: 'SUNWAY', code: '5211', market: 'MY' as const, currency: 'MYR' as const, startOfYearValue: 4.50, endOfYearValue: 4.80, stampDuty: 0, dividendReceived: 0 }
    ];

    marketVals.forEach(mv => {
      const match = stockValuations.find(v => v.year === mv.year && (v.code === mv.code || v.stockName.toLowerCase() === mv.stockName.toLowerCase()));
      if (match) {
        updateStockValuation(match.id, {
          startOfYearValue: mv.startOfYearValue,
          endOfYearValue: mv.endOfYearValue,
          stampDuty: mv.stampDuty,
          dividendReceived: mv.dividendReceived > 0 ? mv.dividendReceived : match.dividendReceived
        });
      } else {
        addStockValuation({
          ...mv
        });
      }
    });

    setMarketSyncStatus('Market prices & annual valuations updated successfully');
    setTimeout(() => setMarketSyncStatus(null), 3000);
  };

  // Sync all dividends for selected year
  const handleSyncDividendsToValuations = () => {
    const yr = typeof valuationYear === 'number' ? valuationYear : 2026;
    stockValuations
      .filter(v => v.year === yr)
      .forEach(val => {
        const divTotal = getAutoDividend(val.code, val.stockName, yr);
        if (divTotal > 0) {
          updateStockValuation(val.id, { dividendReceived: divTotal });
        }
      });
  };

  // Open Sell Modal
  const openSellDialog = (agg: AggregatedHolding) => {
    setSellTarget({
      code: agg.code,
      name: agg.name,
      availableUnits: agg.totalUnits,
      avgBuyPrice: agg.avgBuyPrice,
      currentPrice: agg.currentPrice,
      market: agg.market,
      currency: agg.currency,
    });
    setSellForm({
      unitsToSell: agg.totalUnits,
      sellUnitPrice: agg.currentPrice,
      sellDate: new Date().toISOString().split('T')[0],
      fees: 0,
      notes: '',
    });
    setShowSellModal(true);
  };

  // Submit Sell
  const handleExecuteSell = () => {
    if (!sellTarget || sellForm.unitsToSell <= 0 || sellForm.unitsToSell > sellTarget.availableUnits) return;

    sellHolding({
      code: sellTarget.code,
      name: sellTarget.name,
      unitsToSell: sellForm.unitsToSell,
      sellUnitPrice: sellForm.sellUnitPrice,
      buyUnitPrice: sellTarget.avgBuyPrice,
      sellDate: sellForm.sellDate,
      currency: sellTarget.currency,
      market: sellTarget.market,
      fees: sellForm.fees,
      notes: sellForm.notes,
    });

    setShowSellModal(false);
    setSellTarget(null);
  };

  // Save Valuation Modal
  const handleSaveNewValuation = () => {
    if (!newValuation.stockName.trim()) return;
    const div = getAutoDividend(newValuation.code, newValuation.stockName, newValuation.year);
    addStockValuation({
      ...newValuation,
      dividendReceived: div > 0 ? div : newValuation.dividendReceived
    });
    setShowValuationModal(false);
    setNewValuation({
      year: typeof valuationYear === 'number' ? valuationYear : 2026,
      stockName: '',
      code: '',
      market: 'MY',
      currency: 'MYR',
      startOfYearValue: 0,
      endOfYearValue: 0,
      dividendReceived: 0,
      notes: ''
    });
  };

  // Save inline valuation
  const handleSaveInlineValuation = (id: string, updatedVal: Partial<AnnualStockValuation>, currentVal: AnnualStockValuation, stockCode: string, name: string) => {
    updateStockValuation(id, updatedVal);

    // If endOfYearValue changed, also update subsequent year's startOfYearValue if it exists to maintain continuous flow
    if (typeof updatedVal.endOfYearValue === 'number') {
      const nextYearVal = stockValuations.find(
        v => ((stockCode && v.code === stockCode) || v.stockName.toLowerCase() === name.toLowerCase()) && v.year === currentVal.year + 1
      );
      if (nextYearVal) {
        updateStockValuation(nextYearVal.id, {
          startOfYearValue: updatedVal.endOfYearValue
        });
      }
    }

    setEditingValCell(null);
  };

  const renderValuationLedger = (code: string | undefined, name: string, market: any, currency: any) => {
    const stockCode = code || '';
    const vals = stockValuations
      .filter(v => (stockCode ? v.code === stockCode : false) || v.stockName.toLowerCase() === name.toLowerCase())
      .sort((a, b) => b.year - a.year);

    const handleAddValuation = () => {
      const currentYear = new Date().getFullYear();
      const existingYears = vals.map(v => v.year);
      let targetYear = currentYear;
      if (existingYears.includes(targetYear)) {
        targetYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : currentYear;
      }
      
      // Auto-flow: find the latest preceding year to get its end price as initial price
      const preceding = vals.filter(v => v.year < targetYear).sort((a, b) => b.year - a.year)[0];
      const initialVal = preceding ? preceding.endOfYearValue : 0;
      const stampVal = preceding?.stampDuty || 0;

      addStockValuation({
        year: targetYear,
        stockName: name,
        code: stockCode,
        market,
        currency,
        startOfYearValue: initialVal,
        endOfYearValue: initialVal,
        stampDuty: stampVal,
        dividendReceived: getAutoDividend(stockCode, name, targetYear)
      });
    };

    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 shadow-xs space-y-3 mt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Annual Valuation Ledger</span>
            </h4>
          </div>
          <button
            onClick={handleAddValuation}
            className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Year</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Year</th>
                <th className="py-2.5 px-3 text-right">Initial Price</th>
                <th className="py-2.5 px-3 text-right">End Price</th>
                <th className="py-2.5 px-3 text-right">Stamp Duty</th>
                <th className="py-2.5 px-3 text-right">Div Received</th>
                <th className="py-2.5 px-3 text-center w-12">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    No annual valuation records logged for this stock yet. Click <strong className="text-blue-600">Add Year</strong> to record.
                  </td>
                </tr>
              ) : (
                vals.map(val => {
                  const div = getAutoDividend(val.code, val.stockName, val.year);
                  
                  // Preceding year valuation
                  const prevVal = vals.filter(v => v.year < val.year).sort((a, b) => b.year - a.year)[0];
                  const hasPrev = Boolean(prevVal);
                  // Effective initial price flows from preceding year end of year price
                  const initialVal = hasPrev ? prevVal.endOfYearValue : val.startOfYearValue;

                  const isEditingStart = editingValCell?.id === val.id && editingValCell?.field === 'start';
                  const isEditingEnd = editingValCell?.id === val.id && editingValCell?.field === 'end';
                  const isEditingStampDuty = editingValCell?.id === val.id && editingValCell?.field === 'stampDuty';

                  return (
                    <tr key={val.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Year */}
                      <td className="py-2.5 px-3 font-bold text-gray-900 font-mono text-xs align-middle">
                        {val.year}
                      </td>
                      
                      {/* Initial Price Column */}
                      <td className="py-2.5 px-3 text-right font-mono align-middle">
                        {!hasPrev ? (
                          isEditingStart ? (
                            <input
                              type="number"
                              step="0.001"
                              value={valInputNumber}
                              onChange={e => setValInputNumber(e.target.value)}
                              onBlur={() => {
                                const num = parseFloat(valInputNumber) || 0;
                                handleSaveInlineValuation(val.id, { startOfYearValue: num }, val, stockCode, name);
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const num = parseFloat(valInputNumber) || 0;
                                  handleSaveInlineValuation(val.id, { startOfYearValue: num }, val, stockCode, name);
                                }
                                if (e.key === 'Escape') setEditingValCell(null);
                              }}
                              className="w-24 px-1.5 py-0.5 text-right font-mono font-semibold text-xs border border-blue-500 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                              autoFocus
                              onFocus={e => e.target.select()}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                setEditingValCell({ id: val.id, field: 'start' });
                                setValInputNumber(val.startOfYearValue === 0 ? '' : String(val.startOfYearValue));
                              }}
                              className="cursor-pointer font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded px-1.5 py-0.5 transition-colors inline-block"
                              title="Click to edit initial price"
                            >
                              {formatMoney(initialVal, val.currency as any)}
                            </span>
                          )
                        ) : (
                          <span className="font-semibold text-indigo-600 font-mono px-1.5 py-0.5 inline-block" title="Auto-flows from preceding year End Price">
                            {formatMoney(initialVal, val.currency as any)}
                          </span>
                        )}
                      </td>

                      {/* End Price Column: Direct click to edit number */}
                      <td className="py-2.5 px-3 text-right font-mono align-middle">
                        {isEditingEnd ? (
                          <input
                            type="number"
                            step="0.001"
                            value={valInputNumber}
                            onChange={e => setValInputNumber(e.target.value)}
                            onBlur={() => {
                              const num = parseFloat(valInputNumber) || 0;
                              handleSaveInlineValuation(val.id, { endOfYearValue: num }, val, stockCode, name);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const num = parseFloat(valInputNumber) || 0;
                                handleSaveInlineValuation(val.id, { endOfYearValue: num }, val, stockCode, name);
                              }
                              if (e.key === 'Escape') setEditingValCell(null);
                            }}
                            className="w-24 px-1.5 py-0.5 text-right font-mono font-bold text-xs border border-blue-500 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                            autoFocus
                            onFocus={e => e.target.select()}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingValCell({ id: val.id, field: 'end' });
                              setValInputNumber(val.endOfYearValue === 0 ? '' : String(val.endOfYearValue));
                            }}
                            className="cursor-pointer font-bold text-gray-900 hover:text-blue-600 hover:bg-gray-100 rounded px-1.5 py-0.5 transition-colors inline-block"
                            title="Click to edit end price"
                          >
                            {formatMoney(val.endOfYearValue, val.currency as any)}
                          </span>
                        )}
                      </td>

                      {/* Stamp Duty Column */}
                      <td className="py-2.5 px-3 text-right font-mono align-middle">
                        {isEditingStampDuty ? (
                          <input
                            type="number"
                            step="0.01"
                            value={valInputNumber}
                            onChange={e => setValInputNumber(e.target.value)}
                            onBlur={() => {
                              const num = parseFloat(valInputNumber) || 0;
                              handleSaveInlineValuation(val.id, { stampDuty: num }, val, stockCode, name);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const num = parseFloat(valInputNumber) || 0;
                                handleSaveInlineValuation(val.id, { stampDuty: num }, val, stockCode, name);
                              }
                              if (e.key === 'Escape') setEditingValCell(null);
                            }}
                            className="w-24 px-1.5 py-0.5 text-right font-mono font-semibold text-xs border border-blue-500 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                            autoFocus
                            onFocus={e => e.target.select()}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingValCell({ id: val.id, field: 'stampDuty' });
                              setValInputNumber(val.stampDuty === undefined || val.stampDuty === 0 ? '' : String(val.stampDuty));
                            }}
                            className="cursor-pointer font-semibold text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded px-1.5 py-0.5 transition-colors inline-block"
                            title="Click to edit stamp duty"
                          >
                            {formatMoney(val.stampDuty || 0, val.currency as any)}
                          </span>
                        )}
                      </td>

                      {/* Div Received Column */}
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-600 font-bold align-middle" title="Auto-flows from Dividend Tracker">
                        {formatMoney(div, val.currency as any)}
                      </td>

                      {/* Actions Column */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <button
                          onClick={() => deleteStockValuation(val.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: SubTab Navigation & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('holdings')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'holdings'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Active Holdings
          </button>

          <button
            onClick={() => setActiveSubTab('realized')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'realized'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Realized P/L
          </button>
        </div>

        {activeSubTab === 'holdings' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncAllMarketData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Sync latest market prices and update Annual Valuation Ledger for all active holdings"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Market Prices</span>
            </button>
            <button
              onClick={() => {
                setNewHolding({
                  code: '',
                  name: '',
                  buyDate: new Date().toISOString().split('T')[0],
                  units: 1000,
                  buyUnitPrice: 1.00,
                  market: 'MY',
                  currentPrice: 1.00,
                });
                setShowHoldingModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stock Holding</span>
            </button>
          </div>
        )}
      </div>

      {marketSyncStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{marketSyncStatus}</span>
        </div>
      )}

      {/* ----------------- SUB-TAB 1: ACTIVE HOLDINGS ----------------- */}
      {activeSubTab === 'holdings' && (
        <div className="space-y-6">
          {/* ========================================================= */}
          {/* MOBILE VIEW (block md:hidden) - Approved Layout          */}
          {/* ========================================================= */}
          <div className="block md:hidden space-y-3.5">
            {/* Mobile Header Controls: Segmented Market Switcher + Search Toggle */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Portfolio Market
                  </h3>
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setMobileMarket('MY')}
                      className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                        mobileMarket === 'MY'
                          ? 'shadow-xs bg-white text-slate-900'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Malaysia
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileMarket('US')}
                      className={`px-3.5 py-1 text-xs font-bold rounded-lg transition-all ${
                        mobileMarket === 'US'
                          ? 'shadow-xs bg-white text-slate-900'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Overseas
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSearchOpen(!isMobileSearchOpen);
                      if (isMobileSearchOpen) setMobileSearchQuery('');
                    }}
                    className={`p-2 rounded-xl transition-colors ${
                      isMobileSearchOpen
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Search stocks"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expandable Search Input (Audited to ticker code only) */}
              {isMobileSearchOpen && (
                <div className="relative flex items-center pt-0.5">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={mobileSearchQuery}
                    onChange={e => setMobileSearchQuery(e.target.value)}
                    placeholder="Search stock..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium placeholder:text-slate-400"
                    autoFocus
                  />
                  {mobileSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMobileSearchQuery('')}
                      className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2x2 Summary Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Portfolio Summary
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Total Gross Investment */}
                <div className="space-y-0.5 border-l-2 border-slate-300 pl-2.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Gross Investment</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono block leading-tight">
                    {mobileCurrency} {mobileTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total Portfolio Value */}
                <div className="space-y-0.5 border-l-2 border-blue-500 pl-2.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Portfolio Value</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono block leading-tight">
                    {mobileCurrency} {mobilePortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Unrealized P&L ($) */}
                <div className={`space-y-0.5 border-l-2 pl-2.5 ${mobileUnrealized >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <span className="text-[10px] text-slate-400 font-medium block">Unr. P&L ($)</span>
                  <span className={`text-sm font-extrabold font-mono block leading-tight ${mobileUnrealized >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {mobileCurrency} {mobileUnrealized >= 0 ? '+' : ''}{mobileUnrealized.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Unrealized P&L (%) */}
                <div className={`space-y-0.5 border-l-2 pl-2.5 ${mobileUnrealizedPct >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <span className="text-[10px] text-slate-400 font-medium block">Unr. P&L (%)</span>
                  <span className={`text-sm font-extrabold font-mono block leading-tight ${mobileUnrealizedPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {mobileUnrealizedPct >= 0 ? '+' : ''}{mobileUnrealizedPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Compact 3-Column Holdings Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider items-center select-none">
                <div className="col-span-5 flex flex-col justify-center">
                  <span className="leading-tight text-slate-700 font-extrabold">STOCK NAME</span>
                  <span className="text-[9px] text-slate-400 font-medium leading-tight">QUANTITY</span>
                </div>
                <div className="col-span-3 text-right flex flex-col justify-center pr-1">
                  <span className="leading-tight text-slate-700 font-extrabold">LAST PRICE</span>
                  <span className="text-[9px] text-slate-400 font-medium leading-tight">AVG PRICE</span>
                </div>
                <div className="col-span-4 flex items-center justify-end gap-1.5 pl-1">
                  <div className="text-right flex flex-col justify-center">
                    {mobileRightColumnMode === 'value' ? (
                      <>
                        <span className="leading-tight text-slate-700 font-extrabold">MARKET VALUE</span>
                        <span className="text-[9px] text-slate-400 font-medium leading-tight">TOTAL COST</span>
                      </>
                    ) : (
                      <>
                        <span className="leading-tight text-slate-700 font-extrabold">UNR. P&L ($)</span>
                        <span className="text-[9px] text-slate-400 font-medium leading-tight">UNR. P&L (%)</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileRightColumnMode(mobileRightColumnMode === 'value' ? 'pnl' : 'value')}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer"
                    title="Toggle Market Value / P&L display"
                  >
                    <span className="font-bold text-xs leading-none select-none">⇄</span>
                  </button>
                </div>
              </div>

              {/* Holdings Rows */}
              <div className="divide-y divide-slate-100">
                {mobileFilteredHoldings.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      {mobileSearchQuery
                        ? `No stocks matching "${mobileSearchQuery}"`
                        : `No active ${mobileMarket === 'MY' ? 'Malaysia' : 'Overseas'} stock holdings.`}
                    </p>
                  </div>
                ) : (
                  mobileFilteredHoldings.map(h => {
                    const isProfit = h.unrealizedPL >= 0;
                    const pnlColor = isProfit ? 'text-emerald-600' : 'text-rose-600';
                    const isSelected = selectedMobileStock?.code === h.code;

                    return (
                      <div key={h.code} className="transition-colors">
                        <div
                          onClick={() => setSelectedMobileStock(isSelected ? null : h)}
                          className="grid grid-cols-12 px-3 py-3 items-center hover:bg-slate-50/70 active:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {/* Left Column: Stock Name & Quantity */}
                          <div className="col-span-5 flex flex-col min-w-0 pr-1">
                            <div className="font-extrabold text-xs text-slate-900 truncate leading-tight" title={h.name || h.code}>
                              {h.name || h.code}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 leading-tight">
                              {h.totalUnits.toLocaleString()}
                            </div>
                          </div>

                          {/* Middle Column: Last Price & Avg Price */}
                          <div className="col-span-3 text-right font-mono pr-1">
                            <div className="font-extrabold text-xs text-slate-900 leading-tight">
                              {h.currentPrice.toFixed(3)}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                              {h.avgBuyPrice.toFixed(3)}
                            </div>
                          </div>

                          {/* Right Column: Value or P&L */}
                          <div className="col-span-4 text-right font-mono pl-1">
                            {mobileRightColumnMode === 'value' ? (
                              <>
                                <div className="font-extrabold text-xs text-slate-900 leading-tight">
                                  {h.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                                  {h.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={`font-extrabold text-xs leading-tight ${pnlColor}`}>
                                  {isProfit ? '+' : ''}{h.unrealizedPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className={`text-[10px] font-bold mt-0.5 leading-tight ${pnlColor}`}>
                                  {isProfit ? '+' : ''}{h.gainPercent.toFixed(2)}%
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Expanded mobile details drawer if row is tapped */}
                        {isSelected && (
                          <div className="bg-slate-50 px-3 py-3 border-t border-slate-100 space-y-2.5 animate-in fade-in">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-700">{h.name}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddLotForStock(h.code, h.name, h.market, h.currentPrice);
                                  }}
                                  className="px-2 py-1 bg-blue-600 text-white font-bold text-[11px] rounded-lg shadow-2xs"
                                >
                                  + Buy Lot
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSellDialog(h);
                                  }}
                                  className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[11px] rounded-lg shadow-2xs"
                                >
                                  Sell
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {h.lots.length} purchase lot{h.lots.length > 1 ? 's' : ''} logged • Tap row to collapse
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DESKTOP VIEW (hidden md:block) - Preserved Unchanged     */}
          {/* ========================================================= */}
          <div className="hidden md:block space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Total Portfolio Value (MYR)
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    {latestYear}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-indigo-600 font-mono">
                  {formatRM(portfolioValueMYR)}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] block">Total Gross Investment</span>
                  <span className="font-bold text-gray-700 font-mono text-xs">{formatRM(totalCostMYR)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-[10px] block">Unrealized P/L</span>
                  <span className={`font-bold font-mono text-xs ${unrealizedMYR >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {unrealizedMYR >= 0 ? '+' : '-'}{formatRM(Math.abs(unrealizedMYR))}
                    <span className="text-[10px] ml-1 font-medium">
                      ({unrealizedMYR >= 0 ? '+' : ''}{unrealizedMYRPct.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Total Portfolio Value (USD)
                  </span>
                  <span className="text-[10px] font-semibold text-gray-400">
                    {latestYear}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-indigo-600 font-mono">
                  {formatUSD(portfolioValueUSD)}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] block">Total Gross Investment</span>
                  <span className="font-bold text-gray-700 font-mono text-xs">{formatUSD(totalCostUSD)}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 text-[10px] block">Unrealized P/L</span>
                  <span className={`font-bold font-mono text-xs ${unrealizedUSD >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {unrealizedUSD >= 0 ? '+' : '-'}{formatUSD(Math.abs(unrealizedUSD))}
                    <span className="text-[10px] ml-1 font-medium">
                      ({unrealizedUSD >= 0 ? '+' : ''}{unrealizedUSDPct.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Bar & Dropdown Expand Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {(['ALL', 'MY', 'US', 'Crypto'] as const).map(mkt => (
                <button
                  key={mkt}
                  onClick={() => setHoldingMarketFilter(mkt)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    holdingMarketFilter === mkt
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mkt === 'ALL' ? 'All Markets' : mkt === 'MY' ? 'Malaysia (MYR)' : mkt === 'US' ? 'Overseas (USD)' : 'Crypto'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={expandAllLots}
                  className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Expand all purchase lots dropdowns"
                >
                  Expand All Lots
                </button>
                <button
                  onClick={collapseAllLots}
                  className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-gray-900 hover:bg-white rounded-lg transition-all cursor-pointer"
                  title="Collapse all purchase lots dropdowns"
                >
                  Collapse
                </button>
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search stock..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Holdings Table with Dropdown Purchase Lots */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh] no-scrollbar touch-scroll relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 min-w-[160px] sticky left-0 top-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Stock</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4 text-right">Units</th>
                    <th className="py-3 px-4 text-right">Avg Cost</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4 text-right">Market Value</th>
                    <th className="py-3 px-4 text-right">P/L %</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                  {filteredAggregated.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        No stock holdings matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAggregated.map(agg => {
                      const isExpanded = expandedCodes.has(agg.code);
                      return (
                        <React.Fragment key={agg.code}>
                          <tr className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-3 px-4 sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(agg.code)}
                                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Collapse Purchase Lots' : 'Drop Down All Purchase Lots'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <div>
                                  <div className="font-bold text-gray-900 flex items-center gap-2">
                                    <span>{agg.name}</span>
                                  </div>
                                  <span className="font-mono text-[10px] text-gray-400">{agg.code}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                agg.market === 'MY' ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                              }`}>
                                {agg.market}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-semibold">
                              {agg.totalUnits.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-mono">
                              {formatMoney(agg.avgBuyPrice, agg.currency)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                              {formatMoney(agg.totalCost, agg.currency)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-gray-900">
                              {formatMoney(agg.marketValue, agg.currency)}
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${
                              agg.gainPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {agg.gainPercent >= 0 ? '+' : ''}{agg.gainPercent.toFixed(2)}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openAddLotForStock(agg.code, agg.name, agg.market, agg.currentPrice)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Add Purchase Lot for this stock"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openSellDialog(agg)}
                                  className="px-2.5 py-1 bg-gray-50 hover:bg-rose-50 hover:text-rose-600 text-gray-700 border border-gray-200 font-bold rounded-lg transition-all text-[11px] cursor-pointer"
                                >
                                  Sell
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Inline Dropdown for All Purchase Lots */}
                          {isExpanded && (
                            <tr className="bg-gray-50 border-y border-gray-200">
                              <td colSpan={8} className="p-4">
                                <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-xs space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Layers className="w-4 h-4 text-blue-600" />
                                      <h4 className="text-xs font-bold text-gray-900">
                                        All Purchase Lots for {agg.name} ({agg.code})
                                      </h4>
                                      <span className="text-[11px] text-gray-400">
                                        ({agg.lots.length} logged purchase transactions)
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => openAddLotForStock(agg.code, agg.name, agg.market, agg.currentPrice)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Add Purchase Lot</span>
                                    </button>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[10px] uppercase">
                                          <th className="py-2 px-3">Lot Buy Date</th>
                                          <th className="py-2 px-3 text-right">Units</th>
                                          <th className="py-2 px-3 text-right">Buy Price</th>
                                          <th className="py-2 px-3 text-right">Total Cost</th>
                                          <th className="py-2 px-3 text-right">Current Value</th>
                                          <th className="py-2 px-3 text-right">P/L</th>
                                          <th className="py-2 px-3 text-center w-20">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {agg.lots.map((lot, idx) => {
                                          const cost = lot.units * lot.buyUnitPrice;
                                          const val = lot.units * (lot.currentPrice || agg.currentPrice);
                                          const pl = val - cost;
                                          const plPct = cost > 0 ? (pl / cost) * 100 : 0;
                                          return (
                                            <tr key={lot.id} className="hover:bg-gray-50/70">
                                              <td className="py-2 px-3 font-mono text-gray-700 font-medium">
                                                {lot.buyDate || `Lot #${idx + 1}`}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900">
                                                {lot.units.toLocaleString()}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono text-gray-700">
                                                {formatMoney(lot.buyUnitPrice, agg.currency)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                                {formatMoney(cost, agg.currency)}
                                              </td>
                                              <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                                                {formatMoney(val, agg.currency)}
                                              </td>
                                              <td className={`py-2 px-3 text-right font-mono font-bold ${
                                                pl >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                              }`}>
                                                {pl >= 0 ? '+' : ''}{formatMoney(pl, agg.currency)} ({plPct.toFixed(1)}%)
                                              </td>
                                              <td className="py-2 px-3 text-center">
                                                <button
                                                  onClick={() => deleteHolding(lot.id)}
                                                  className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                                  title="Delete this purchase lot"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  {renderValuationLedger(agg.code, agg.name, agg.market, agg.currency)}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ----------------- SUB-TAB 2: REALIZED P/L ----------------- */}
      {activeSubTab === 'realized' && (
        <div className="space-y-6">
          {/* ========================================================= */}
          {/* MOBILE VIEW (block md:hidden) - Exact 3-Column Layout     */}
          {/* ========================================================= */}
          <div className="block md:hidden space-y-3.5">
            {/* Mobile Header Controls: Segmented Market Switcher + Search Toggle */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Portfolio Market
                  </h3>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMobileRealizedMarket('MY')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        mobileRealizedMarket === 'MY'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Malaysia
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileRealizedMarket('US')}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        mobileRealizedMarket === 'US'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Overseas
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileSearchOpen(!isMobileSearchOpen);
                      if (isMobileSearchOpen) setMobileSearchQuery('');
                    }}
                    className={`p-2 rounded-xl transition-colors ${
                      isMobileSearchOpen
                        ? 'bg-blue-50 text-blue-600 border border-blue-100'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Search trades"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expandable Search Input */}
              {isMobileSearchOpen && (
                <div className="relative flex items-center pt-0.5">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={mobileSearchQuery}
                    onChange={e => setMobileSearchQuery(e.target.value)}
                    placeholder="Search trade..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium placeholder:text-slate-400"
                    autoFocus
                  />
                  {mobileSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMobileSearchQuery('')}
                      className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2x2 Summary Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Portfolio Summary
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Total Realized Gain */}
                <div className="space-y-0.5 border-l-2 border-slate-300 pl-2.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Realized Gain</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono block leading-tight">
                    {mobileRealizedSummary.currency} {mobileRealizedSummary.totalGain.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total Realized Loss */}
                <div className="space-y-0.5 border-l-2 border-blue-500 pl-2.5">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Realized Loss</span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono block leading-tight">
                    {mobileRealizedSummary.currency} {mobileRealizedSummary.totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Realized P&L ($) */}
                <div className={`space-y-0.5 border-l-2 pl-2.5 ${mobileRealizedSummary.netPL >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <span className="text-[10px] text-slate-400 font-medium block">Realized P&L ($)</span>
                  <span className={`text-sm font-extrabold font-mono block leading-tight ${
                    mobileRealizedSummary.netPL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {mobileRealizedSummary.currency} {mobileRealizedSummary.netPL >= 0 ? '+' : ''}{mobileRealizedSummary.netPL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Realized P&L (%) */}
                <div className={`space-y-0.5 border-l-2 pl-2.5 ${mobileRealizedSummary.netReturnPct >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <span className="text-[10px] text-slate-400 font-medium block">Realized P&L (%)</span>
                  <span className={`text-sm font-extrabold font-mono block leading-tight ${
                    mobileRealizedSummary.netReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {mobileRealizedSummary.netReturnPct >= 0 ? '+' : ''}{mobileRealizedSummary.netReturnPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Compact 3-Column Realized P/L Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 bg-white border-b border-slate-200 px-3.5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider items-center select-none">
                <div className="col-span-5 flex flex-col justify-center">
                  <span className="leading-tight text-slate-800 font-extrabold">STOCK NAME</span>
                  <span className="text-[9px] text-slate-400 font-medium leading-tight">QUANTITY</span>
                </div>
                <div className="col-span-3 text-right flex flex-col justify-center pr-1">
                  <span className="leading-tight text-slate-800 font-extrabold">PURCHASE PRICE</span>
                  <span className="text-[9px] text-slate-400 font-medium leading-tight">DISPOSAL PRICE</span>
                </div>
                <div className="col-span-4 flex items-center justify-end gap-1.5 pl-1">
                  <div className="text-right flex flex-col justify-center">
                    {mobileRealizedRightColumnMode === 'pnl' ? (
                      <>
                        <span className="leading-tight text-slate-800 font-extrabold">REALIZED P&L ($)</span>
                        <span className="text-[9px] text-slate-400 font-medium leading-tight">REALIZED P&L (%)</span>
                      </>
                    ) : (
                      <>
                        <span className="leading-tight text-slate-800 font-extrabold">PURCHASE DATE</span>
                        <span className="text-[9px] text-slate-400 font-medium leading-tight">DISPOSAL DATE</span>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileRealizedRightColumnMode(mobileRealizedRightColumnMode === 'pnl' ? 'date' : 'pnl')}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs flex items-center justify-center shrink-0 cursor-pointer"
                    title="Toggle Realized P&L / Dates"
                  >
                    <span className="font-bold text-xs leading-none select-none">⇄</span>
                  </button>
                </div>
              </div>

              {/* Trade Rows */}
              <div className="divide-y divide-slate-100">
                {mobileFilteredRealizedTrades.length === 0 ? (
                  <div className="py-8 px-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      {mobileSearchQuery
                        ? `No trades matching "${mobileSearchQuery}"`
                        : `No realized ${mobileRealizedMarket === 'MY' ? 'Malaysia' : 'Overseas'} stock trades.`}
                    </p>
                  </div>
                ) : (
                  mobileFilteredRealizedTrades.map(trade => {
                    const buyTotal = trade.units * trade.buyUnitPrice;
                    const sellTotal = trade.units * trade.sellUnitPrice;
                    const fee = trade.fees || 0;
                    const netGain = sellTotal - buyTotal - fee;
                    const roi = buyTotal > 0 ? (netGain / buyTotal) * 100 : 0;
                    const isProfit = netGain >= 0;
                    const pnlColor = isProfit ? 'text-emerald-600' : 'text-rose-600';

                    // Format dates to MM/YYYY
                    const formatMMYYYY = (dateStr: string) => {
                      if (!dateStr) return '-';
                      const parts = dateStr.split('-');
                      if (parts.length === 3) {
                        const yr = parts[0].length === 4 ? parts[0] : parts[2];
                        const mo = parts[0].length === 4 ? parts[1] : parts[0];
                        return `${mo.padStart(2, '0')}/${yr}`;
                      }
                      return dateStr;
                    };

                    return (
                      <div key={trade.id} className="grid grid-cols-12 px-3.5 py-3 items-center hover:bg-slate-50/70 transition-colors">
                        {/* Left Column: Stock Name & Quantity */}
                        <div className="col-span-5 flex flex-col min-w-0 pr-1">
                          <div className="font-extrabold text-xs text-slate-900 truncate leading-tight" title={trade.name || trade.code}>
                            {trade.name || trade.code}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 leading-tight">
                            {trade.units.toLocaleString()}
                          </div>
                        </div>

                        {/* Middle Column: Purchase Price & Disposal Price */}
                        <div className="col-span-3 text-right font-mono pr-1">
                          <div className="font-extrabold text-xs text-slate-900 leading-tight">
                            {trade.buyUnitPrice.toFixed(3)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                            {trade.sellUnitPrice.toFixed(3)}
                          </div>
                        </div>

                        {/* Right Column: Realized P&L or Purchase/Disposal Dates */}
                        <div className="col-span-4 text-right font-mono pl-1">
                          {mobileRealizedRightColumnMode === 'pnl' ? (
                            <>
                              <div className={`font-extrabold text-xs leading-tight ${pnlColor}`}>
                                {isProfit ? '+' : ''}{formatMoney(netGain, trade.currency)}
                              </div>
                              <div className={`text-[11px] font-bold mt-0.5 leading-tight ${pnlColor}`}>
                                {isProfit ? '+' : ''}{roi.toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-extrabold text-xs text-slate-900 leading-tight">
                                {formatMMYYYY(trade.buyDate)}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                                {formatMMYYYY(trade.sellDate)}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* DESKTOP / TABLET VIEW (hidden md:block) - Untouched       */}
          {/* ========================================================= */}
          <div className="hidden md:block space-y-6">
          {/* Filter Bar with Standard YearSelector & Right-Click to Delete */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <YearSelector
                years={realizedYears}
                selectedYear={realizedYearFilter}
                onSelectYear={setRealizedYearFilter}
                showAllOption={true}
                allLabel="All Years"
                label="Year"
                onAddYear={(yr) => setRealizedYearFilter(yr)}
                onDeleteYear={(yr) => {
                  const toDelete = realizedTrades.filter(t => t.sellDate.includes(yr.toString()));
                  toDelete.forEach(t => deleteTrade(t.id));
                  setRealizedYearFilter('ALL');
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {(['ALL', 'MY', 'US', 'Crypto'] as const).map(mkt => (
                  <button
                    key={mkt}
                    onClick={() => setRealizedMarketFilter(mkt)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      realizedMarketFilter === mkt
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {mkt}
                  </button>
                ))}
              </div>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search trades..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Realized P/L KPIs */}
          <div className="space-y-3">
            {/* MYR Row */}
            {(realizedMarketFilter === 'ALL' || realizedMarketFilter === 'MY') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Realized Trades (MYR)
                  </span>
                  <p className="text-lg font-extrabold text-blue-600 font-mono">
                    {filteredTrades.filter(t => t.currency === 'MYR').length} Trades
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Total Gain (MYR)
                  </span>
                  <p className="text-lg font-extrabold text-emerald-600 font-mono">
                    +{formatRM(realizedSummary.winMYR)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Total Loss (MYR)
                  </span>
                  <p className="text-lg font-extrabold text-rose-600 font-mono">
                    {realizedSummary.lossMYR !== 0
                      ? formatRM(Math.abs(realizedSummary.lossMYR)).replace('RM ', '-RM ')
                      : 'RM 0.00'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Admin Fees (MYR)
                  </span>
                  <p className="text-lg font-extrabold text-gray-500 font-mono">
                    {formatRM(realizedSummary.feesMYR)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Net P/L (MYR)
                  </span>
                  <p className={`text-lg font-extrabold font-mono ${realizedSummary.netMYR >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {realizedSummary.netMYR >= 0 ? '+' : ''}
                    {realizedSummary.netMYR < 0
                      ? formatRM(Math.abs(realizedSummary.netMYR)).replace('RM ', '-RM ')
                      : formatRM(realizedSummary.netMYR)}
                  </p>
                </div>
              </div>
            )}

            {/* USD Row */}
            {(realizedMarketFilter === 'ALL' || realizedMarketFilter === 'US' || realizedMarketFilter === 'Crypto') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Realized Trades (USD)
                  </span>
                  <p className="text-lg font-extrabold text-blue-600 font-mono">
                    {filteredTrades.filter(t => t.currency === 'USD').length} Trades
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Total Gain (USD)
                  </span>
                  <p className="text-lg font-extrabold text-emerald-600 font-mono">
                    +{formatUSD(realizedSummary.winUSD)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Total Loss (USD)
                  </span>
                  <p className="text-lg font-extrabold text-rose-600 font-mono">
                    {realizedSummary.lossUSD !== 0
                      ? formatUSD(Math.abs(realizedSummary.lossUSD)).replace('$ ', '-$ ')
                      : '$ 0.00'}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Admin Fees (USD)
                  </span>
                  <p className="text-lg font-extrabold text-gray-500 font-mono">
                    {formatUSD(realizedSummary.feesUSD)}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                    Net P/L (USD)
                  </span>
                  <p className={`text-lg font-extrabold font-mono ${realizedSummary.netUSD >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {realizedSummary.netUSD >= 0 ? '+' : ''}
                    {realizedSummary.netUSD < 0
                      ? formatUSD(Math.abs(realizedSummary.netUSD)).replace('$ ', '-$ ')
                      : formatUSD(realizedSummary.netUSD)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Realized Trades Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh] no-scrollbar touch-scroll relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 min-w-[160px] sticky left-0 top-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Asset</th>
                    <th className="py-3 px-4">Market</th>
                    <th className="py-3 px-4">Buy Date</th>
                    <th className="py-3 px-4">Sell Date</th>
                    <th className="py-3 px-4 text-right">Units</th>
                    <th className="py-3 px-4 text-right">Buy Price</th>
                    <th className="py-3 px-4 text-right">Sell Price</th>
                    <th className="py-3 px-4 text-right">Admin Fee</th>
                    <th className="py-3 px-4 text-right">Net Gain / Loss</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-400">
                        No realized trades matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map(trade => {
                      const totalBuy = trade.units * trade.buyUnitPrice;
                      const totalSell = trade.units * trade.sellUnitPrice;
                      const fee = trade.fees || 0;
                      const netGain = totalSell - totalBuy - fee;
                      const roi = totalBuy > 0 ? (netGain / totalBuy) * 100 : 0;
                      const isExpanded = expandedCodes.has(trade.id);

                      return (
                        <React.Fragment key={trade.id}>
                          <tr className="hover:bg-gray-50/70 transition-colors group">
                            <td className="py-2.5 px-4 sticky left-0 z-10 bg-white group-hover:bg-gray-50/70 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(trade.id)}
                                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                                  title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <div>
                                  <div className="font-bold text-gray-900">{trade.name}</div>
                                  <span className="font-mono text-[10px] text-gray-400">{trade.code}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                                {trade.market}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 font-mono text-[11px]">{trade.buyDate}</td>
                            <td className="py-2.5 px-4 text-gray-900 font-mono text-[11px] font-semibold">{trade.sellDate}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{trade.units.toLocaleString()}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{formatMoney(trade.buyUnitPrice, trade.currency)}</td>
                            <td className="py-2.5 px-4 text-right font-mono">{formatMoney(trade.sellUnitPrice, trade.currency)}</td>
                            <td className="py-2.5 px-4 text-right font-mono text-gray-500">
                              {formatMoney(fee, trade.currency)}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                              netGain >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              <div>{formatMoney(netGain, trade.currency)}</div>
                              <span className="text-[10px] font-normal">({roi >= 0 ? '+' : ''}{roi.toFixed(2)}%)</span>
                            </td>
                            <td className="py-2.5 px-4 text-[11px] text-gray-500 max-w-xs truncate">{trade.notes || '-'}</td>
                            <td className="py-2.5 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => deleteTrade(trade.id)}
                                className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50 border-y border-gray-200">
                              <td colSpan={11} className="p-4">
                                {renderValuationLedger(trade.code, trade.name, trade.market, trade.currency)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Add Stock Holding Modal */}
      {showHoldingModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Add Stock Holding / Lot</h3>
              <button
                onClick={() => setShowHoldingModal(false)}
                className="text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newHolding.name || newHolding.units <= 0) return;
                addHolding(newHolding);
                setShowHoldingModal(false);
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Stock Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MAYBANK, APPLE"
                    value={newHolding.name}
                    onChange={e => setNewHolding({ ...newHolding, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Code / Ticker</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1155, AAPL"
                    value={newHolding.code}
                    onChange={e => setNewHolding({ ...newHolding, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Market</label>
                  <select
                    value={newHolding.market}
                    onChange={e => setNewHolding({ ...newHolding, market: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="MY">Malaysia (MYR)</option>
                    <option value="US">US / Global (USD)</option>
                    <option value="Crypto">Crypto (USD)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Buy Date</label>
                  <input
                    type="date"
                    required
                    value={newHolding.buyDate}
                    onChange={e => setNewHolding({ ...newHolding, buyDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Units (Quantity)</label>
                  <FormattedNumberInput
                    required
                    value={newHolding.units}
                    onChange={v => setNewHolding({ ...newHolding, units: v })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Buy Price Per Unit</label>
                  <FormattedNumberInput
                    required
                    value={newHolding.buyUnitPrice}
                    maxDecimals={4}
                    onChange={v => setNewHolding({ ...newHolding, buyUnitPrice: v })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 block mb-1">Current Unit Price (Market)</label>
                <FormattedNumberInput
                  value={newHolding.currentPrice}
                  maxDecimals={4}
                  onChange={v => setNewHolding({ ...newHolding, currentPrice: v })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHoldingModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  Save Holding
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sell Modal */}
      {showSellModal && sellTarget && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Sell Holding: {sellTarget.name} ({sellTarget.code})
              </h3>
              <button
                onClick={() => setShowSellModal(false)}
                className="text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Available Units:</span>
                <span className="font-bold font-mono text-gray-900">{sellTarget.availableUnits.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Buy Price:</span>
                <span className="font-bold font-mono text-gray-900">{formatMoney(sellTarget.avgBuyPrice, sellTarget.currency)}</span>
              </div>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleExecuteSell();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Units to Sell</label>
                  <FormattedNumberInput
                    max={sellTarget.availableUnits}
                    min={1}
                    required
                    value={sellForm.unitsToSell}
                    onChange={v => setSellForm({ ...sellForm, unitsToSell: v })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Sell Price Per Unit</label>
                  <FormattedNumberInput
                    required
                    value={sellForm.sellUnitPrice}
                    maxDecimals={4}
                    onChange={v => setSellForm({ ...sellForm, sellUnitPrice: v })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Sell Date</label>
                  <input
                    type="date"
                    required
                    value={sellForm.sellDate}
                    onChange={e => setSellForm({ ...sellForm, sellDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-600 block mb-1">Brokerage / Fees</label>
                  <FormattedNumberInput
                    value={sellForm.fees}
                    maxDecimals={2}
                    onChange={v => setSellForm({ ...sellForm, fees: v })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-600 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Taking profit, rebalancing"
                  value={sellForm.notes}
                  onChange={e => setSellForm({ ...sellForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSellModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold shadow-xs hover:bg-rose-700 cursor-pointer"
                >
                  Confirm Sell
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

