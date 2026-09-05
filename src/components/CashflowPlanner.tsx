import React, { useState, useMemo, useEffect } from 'react';
import { useWealth } from '../context/WealthContext';
import {
  Plus,
  Landmark,
  Trash2,
  X,
  Layers,
  Wallet,
  Target,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Info,
  Check,
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from 'recharts';
import { YearSelector } from './YearSelector';
import { LedgerCalculatorModal } from './LedgerCalculatorModal';
import { FormattedNumberInput } from './FormattedNumberInput';

export const CashflowPlanner: React.FC = () => {
  const {
    incomes,
    expenses,
    setIncomesList,
    setExpensesList,
    passiveAccounts,
    setPassiveAccountsList,
    holdings,
    stockValuations,
    dividends,
    updateIncomeForYear,
    updateExpenseForYear,
    copyCashflowYear,
    addIncomeCategory,
    updateIncomeCategoryName,
    moveIncome,
    addExpenseCategory,
    updateExpenseCategoryName,
    moveExpense,
    deleteIncomeCategory,
    deleteExpenseCategory,
    updatePassiveAccount,
    updatePassiveAccountMonthData,
    updatePassiveAccountCalcNotes,
    movePassiveAccount,
    addPassiveAccount,
    deletePassiveAccount,
    fireTargetMonthly,
    setFireTargetMonthly,
    includedPrincipalAccountIds,
    setIncludedPrincipalAccountIds,
  } = useWealth();

  const [activeTab, setActiveTab] = useState<'cashflow' | 'passive'>('cashflow');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [availableYears, setAvailableYears] = useState<number[]>([2023, 2024, 2025, 2026]);

  // Interactive Ledger Calculator State (No fx badges in table, opens mini calculator on click)
  const [activeLedgerCalc, setActiveLedgerCalc] = useState<{
    isOpen: boolean;
    accountId: string;
    accountName: string;
    month: string;
    year: number;
    currency: string;
    initialNotes: string;
    initialValue: number;
  } | null>(null);

  // Modals
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategoryType, setAddCategoryType] = useState<'income' | 'expense'>('income');
  const [newCatName, setNewCatName] = useState('');

  // Drag-and-drop & sort states for Expenses
  const [draggedExpenseId, setDraggedExpenseId] = useState<string | null>(null);
  const [dragOverExpenseId, setDragOverExpenseId] = useState<string | null>(null);
  const [expenseSortOrder, setExpenseSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Drag-and-drop & sort states for Incomes
  const [draggedIncomeId, setDraggedIncomeId] = useState<string | null>(null);
  const [dragOverIncomeId, setDragOverIncomeId] = useState<string | null>(null);
  const [incomeSortOrder, setIncomeSortOrder] = useState<'none' | 'asc' | 'desc'>('none');

  // Drag-and-drop states for Passive Accounts
  const [draggedPassiveId, setDraggedPassiveId] = useState<string | null>(null);
  const [dragOverPassiveId, setDragOverPassiveId] = useState<string | null>(null);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Total Principal customization state
  const [showPrincipalSelectorModal, setShowPrincipalSelectorModal] = useState(false);

  const toggleIncludeAccount = (id: string) => {
    setIncludedPrincipalAccountIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllPrincipalAccounts = () => {
    setIncludedPrincipalAccountIds(passiveAccounts.map(a => a.id));
  };

  const deselectAllPrincipalAccounts = () => {
    setIncludedPrincipalAccountIds([]);
  };

  // Active Stock Portfolio market totals from active holdings & valuation sync (Matching StockPortfolio component)
  const activeMyStockPrincipal = useMemo(() => {
    const map = new Map<string, { totalUnits: number; totalCost: number; currentPrice: number; avgBuyPrice: number; code: string; name: string }>();
    holdings.filter(h => h.market === 'MY').forEach(h => {
      const key = (h.code ? h.code.trim().toUpperCase() : h.name.trim().toUpperCase());
      if (!map.has(key)) {
        map.set(key, {
          code: h.code || '',
          name: h.name.replace(/\s*\(Lot\s*\d+\)/i, '').trim(),
          totalUnits: 0,
          totalCost: 0,
          currentPrice: h.currentPrice ?? h.buyUnitPrice,
          avgBuyPrice: 0,
        });
      }
      const agg = map.get(key)!;
      agg.totalUnits += h.units;
      agg.totalCost += h.units * h.buyUnitPrice;
    });

    let total = 0;
    map.forEach(agg => {
      agg.avgBuyPrice = agg.totalUnits > 0 ? agg.totalCost / agg.totalUnits : 0;
      const stockCode = (agg.code || '').trim().toUpperCase();
      const stockName = (agg.name || '').trim().toLowerCase();
      const matchingVals = stockValuations.filter(v =>
        (stockCode && v.code && v.code.trim().toUpperCase() === stockCode) ||
        (stockName && v.stockName && v.stockName.trim().toLowerCase() === stockName) ||
        (stockName && v.stockName && (v.stockName.toLowerCase().includes(stockName) || stockName.includes(v.stockName.toLowerCase())))
      ).sort((a, b) => b.year - a.year);

      if (matchingVals.length > 0) {
        const latestVal = matchingVals[0];
        const valAmt = latestVal.endOfYearValue > 0 ? latestVal.endOfYearValue : (latestVal.startOfYearValue > 0 ? latestVal.startOfYearValue : 0);
        if (valAmt > 0) {
          total += agg.totalUnits * valAmt;
          return;
        }
      }
      total += agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
    });

    return total;
  }, [holdings, stockValuations]);

  const activeUsStockPrincipal = useMemo(() => {
    const map = new Map<string, { totalUnits: number; totalCost: number; currentPrice: number; avgBuyPrice: number; code: string; name: string }>();
    holdings.filter(h => h.market === 'US').forEach(h => {
      const key = (h.code ? h.code.trim().toUpperCase() : h.name.trim().toUpperCase());
      if (!map.has(key)) {
        map.set(key, {
          code: h.code || '',
          name: h.name.replace(/\s*\(Lot\s*\d+\)/i, '').trim(),
          totalUnits: 0,
          totalCost: 0,
          currentPrice: h.currentPrice ?? h.buyUnitPrice,
          avgBuyPrice: 0,
        });
      }
      const agg = map.get(key)!;
      agg.totalUnits += h.units;
      agg.totalCost += h.units * h.buyUnitPrice;
    });

    let total = 0;
    map.forEach(agg => {
      agg.avgBuyPrice = agg.totalUnits > 0 ? agg.totalCost / agg.totalUnits : 0;
      const stockCode = (agg.code || '').trim().toUpperCase();
      const stockName = (agg.name || '').trim().toLowerCase();
      const matchingVals = stockValuations.filter(v =>
        (stockCode && v.code && v.code.trim().toUpperCase() === stockCode) ||
        (stockName && v.stockName && v.stockName.trim().toLowerCase() === stockName) ||
        (stockName && v.stockName && (v.stockName.toLowerCase().includes(stockName) || stockName.includes(v.stockName.toLowerCase())))
      ).sort((a, b) => b.year - a.year);

      if (matchingVals.length > 0) {
        const latestVal = matchingVals[0];
        const valAmt = latestVal.endOfYearValue > 0 ? latestVal.endOfYearValue : (latestVal.startOfYearValue > 0 ? latestVal.startOfYearValue : 0);
        if (valAmt > 0) {
          total += agg.totalUnits * valAmt;
          return;
        }
      }
      total += agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
    });

    return total;
  }, [holdings, stockValuations]);

  const parseBuyDate = (dateStr?: string): { year: number; monthIdx: number } | null => {
    if (!dateStr) return null;
    const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const cleanStr = dateStr.trim().toLowerCase();
    
    const yrMatch = cleanStr.match(/\b(20\d\d)\b/);
    const year = yrMatch ? parseInt(yrMatch[1], 10) : 2026;
    
    let monthIdx = 0;
    for (let i = 0; i < MONTH_NAMES.length; i++) {
      if (cleanStr.includes(MONTH_NAMES[i])) {
        monthIdx = i;
        break;
      }
    }
    
    return { year, monthIdx };
  };

  const getStockPrincipalForMonth = (market: 'MY' | 'US', yr: number, monthKey: string = 'Dec') => {
    const targetMonthIdx = months.indexOf(monthKey) >= 0 ? months.indexOf(monthKey) : 11;

    // 1. Group active holdings for this market acquired on or before yr and targetMonthIdx
    const map = new Map<string, { totalUnits: number; totalCost: number; currentPrice: number; avgBuyPrice: number; code: string; name: string }>();
    holdings
      .filter(h => h.market === market)
      .forEach(h => {
        const parsed = parseBuyDate(h.buyDate);
        if (parsed) {
          if (parsed.year > yr) return;
          if (parsed.year === yr && parsed.monthIdx > targetMonthIdx) return;
        }

        const key = (h.code ? h.code.trim().toUpperCase() : h.name.trim().toUpperCase());
        if (!map.has(key)) {
          map.set(key, {
            code: h.code || '',
            name: h.name.replace(/\s*\(Lot\s*\d+\)/i, '').trim(),
            totalUnits: 0,
            totalCost: 0,
            currentPrice: h.currentPrice ?? h.buyUnitPrice,
            avgBuyPrice: 0,
          });
        }
        const agg = map.get(key)!;
        agg.totalUnits += h.units;
        agg.totalCost += h.units * h.buyUnitPrice;
      });

    // If no holdings were active in or prior to this month, return 0
    if (map.size === 0) {
      if (market === 'US' && yr === 2026 && targetMonthIdx < 6) {
        return 0;
      }
      if (yr >= 2026) {
        return 0;
      }
    }

    let total = 0;
    const handledValKeys = new Set<string>();

    map.forEach((agg) => {
      agg.avgBuyPrice = agg.totalUnits > 0 ? agg.totalCost / agg.totalUnits : 0;
      const stockCode = (agg.code || '').trim().toUpperCase();
      const stockName = (agg.name || '').trim().toLowerCase();

      // Check valuation specifically for target year yr
      const curYrVal = stockValuations.find(v =>
        v.year === yr &&
        ((stockCode && v.code && v.code.trim().toUpperCase() === stockCode) ||
         (stockName && v.stockName && v.stockName.trim().toLowerCase() === stockName) ||
         (stockName && v.stockName && (v.stockName.toLowerCase().includes(stockName) || stockName.includes(v.stockName.toLowerCase()))))
      );

      if (curYrVal) {
        handledValKeys.add(curYrVal.id);
        const valAmt = curYrVal.endOfYearValue > 0 ? curYrVal.endOfYearValue : (curYrVal.startOfYearValue > 0 ? curYrVal.startOfYearValue : 0);
        if (valAmt > 0) {
          total += agg.totalUnits * valAmt;
          return;
        }
      }

      // If in current active year (2026 or selectedYear), use live holding market value
      if (yr >= 2026 || yr === selectedYear) {
        const val = agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
        if (val > 0) {
          total += val;
          return;
        }
      }

      // Find latest valuation on or before yr
      const prevVals = stockValuations.filter(v =>
        v.year <= yr &&
        ((stockCode && v.code && v.code.trim().toUpperCase() === stockCode) ||
         (stockName && v.stockName && v.stockName.trim().toLowerCase() === stockName) ||
         (stockName && v.stockName && (v.stockName.toLowerCase().includes(stockName) || stockName.includes(v.stockName.toLowerCase()))))
      ).sort((a, b) => b.year - a.year);

      if (prevVals.length > 0) {
        const valAmt = prevVals[0].endOfYearValue > 0 ? prevVals[0].endOfYearValue : (prevVals[0].startOfYearValue > 0 ? prevVals[0].startOfYearValue : 0);
        if (valAmt > 0) {
          total += agg.totalUnits * valAmt;
          return;
        }
      }

      // Fallback to active holding total cost or value
      total += agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
    });

    // Also include any other stock valuations recorded for year yr that aren't in active holdings (e.g. historical stocks like SUNWAY PA)
    if (map.size > 0 || (market === 'MY' && yr < 2026)) {
      stockValuations
        .filter(v =>
          v.year === yr &&
          !handledValKeys.has(v.id) &&
          (v.market === market || (!v.market && ((market === 'MY' && v.currency !== 'USD') || (market === 'US' && v.currency === 'USD'))))
        )
        .forEach(v => {
          const valAmt = v.endOfYearValue > 0 ? v.endOfYearValue : (v.startOfYearValue > 0 ? v.startOfYearValue : 0);
          total += valAmt;
        });
    }

    return total;
  };

  // Calculate dividends from Dividend Tracker for a specific market (MY or US) for given year and month
  const getStockDividendsForMonth = (market: 'MY' | 'US', yr: number, month: string) => {
    const yrDividends = dividends.filter(d => d.year === yr);
    return yrDividends.reduce((sum, d) => {
      const stockNameLower = (d.stockName || '').trim().toLowerCase();
      // Find matching stock in holdings or stockValuations to identify market
      const holding = holdings.find(h =>
        (h.code && (h.code.trim().toLowerCase() === stockNameLower || stockNameLower.includes(h.code.trim().toLowerCase()))) ||
        (h.name && (h.name.trim().toLowerCase() === stockNameLower || stockNameLower.includes(h.name.trim().toLowerCase())))
      );
      const val = stockValuations.find(v =>
        v.year === yr &&
        (((v.code && (v.code.trim().toLowerCase() === stockNameLower || stockNameLower.includes(v.code.trim().toLowerCase())))) ||
          (v.stockName && (v.stockName.trim().toLowerCase() === stockNameLower || stockNameLower.includes(v.stockName.trim().toLowerCase()))))
      );
      
      let stockMarket: 'MY' | 'US' = 'MY';
      if (holding?.market) {
        stockMarket = holding.market === 'US' ? 'US' : 'MY';
      } else if (val?.market) {
        stockMarket = val.market === 'US' ? 'US' : 'MY';
      } else if (
        stockNameLower.includes('us') ||
        stockNameLower.includes('gld') ||
        stockNameLower.includes('spcx') ||
        stockNameLower.includes('aapl') ||
        stockNameLower.includes('nvda') ||
        stockNameLower.includes('gold') ||
        stockNameLower.includes('qqq') ||
        stockNameLower.includes('etf')
      ) {
        stockMarket = 'US';
      }

      if (stockMarket === market) {
        return sum + (d.monthlyPayouts?.[month] || 0);
      }
      return sum;
    }, 0);
  };

  // Identify whether a passive account is linked to MY stock or US stock
  const checkStockAccountType = (item: (typeof passiveAccounts)[0]) => {
    const lower = (item.name || '').toLowerCase().trim();
    const cat = (item.category || '').toLowerCase().trim();
    const id = (item.id || '').toLowerCase();

    // Explicit exclusions for ASNB, Fixed Price funds, Digital Banks, Money Market Funds
    const isNonStock =
      cat === 'asnb' ||
      cat === 'digital bank' ||
      cat === 'money market' ||
      cat === 'fixed deposit' ||
      id.startsWith('p_asm') ||
      id.startsWith('p_digibank') ||
      id.startsWith('p_kdi') ||
      id.startsWith('p_versa') ||
      lower.startsWith('asm') ||
      lower.includes('amanah saham') ||
      lower.includes('asnb') ||
      lower.includes('wawasan') ||
      lower.includes('digital bank') ||
      lower.includes('kdi') ||
      lower.includes('versa');

    if (isNonStock) {
      return { isMy: false, isUs: false };
    }

    // Check if US / Overseas / Global Stock
    const isUs =
      id === 'p_stock_us' ||
      cat === 'us stock' ||
      cat === 'us stocks' ||
      cat === 'overseas stock' ||
      cat === 'us' ||
      lower === 'stock portfolio (us)' ||
      lower.includes('(us)') ||
      lower.includes('us stock') ||
      lower.includes('overseas stock') ||
      lower.includes('global stock');

    // Check if MY / Malaysian Stock
    const isMy =
      !isUs &&
      (id === 'p_stock' ||
       cat === 'stock principal' ||
       cat === 'my stock' ||
       cat === 'my stocks' ||
       cat === 'malaysia stock' ||
       lower === 'stock portfolio (my)' ||
       lower.includes('(my)') ||
       lower.includes('my stock') ||
       lower.includes('bursa stock') ||
       lower.includes('malaysia stock') ||
       (lower.includes('stock') && !lower.includes('us') && !lower.includes('overseas')));

    return { isMy, isUs };
  };

  // Helper to extract monthly amounts for selected year
  const getIncomeValuesForYear = (item: (typeof incomes)[0], year: number) => {
    const yrStr = year.toString();
    if (item.yearlyAmount && item.yearlyAmount[yrStr]) {
      return item.yearlyAmount[yrStr];
    }
    return item.monthlyAmount;
  };

  const getExpenseValuesForYear = (item: (typeof expenses)[0], year: number) => {
    const yrStr = year.toString();
    if (item.yearlyAmount && item.yearlyAmount[yrStr]) {
      return item.yearlyAmount[yrStr];
    }
    return item.monthlyAmount;
  };

  // Monthly Revenue Sum for active year
  const monthlyRevenue = useMemo(() => {
    return months.reduce((acc, m) => {
      acc[m] = incomes.reduce((sum, inc) => {
        const valObj = getIncomeValuesForYear(inc, selectedYear);
        return sum + (valObj[m] || 0);
      }, 0);
      return acc;
    }, {} as { [m: string]: number });
  }, [incomes, selectedYear]);

  // Monthly Expense Sum for active year
  const monthlyExpensesTotal = useMemo(() => {
    return months.reduce((acc, m) => {
      acc[m] = expenses.reduce((sum, exp) => {
        const valObj = getExpenseValuesForYear(exp, selectedYear);
        return sum + (valObj[m] || 0);
      }, 0);
      return acc;
    }, {} as { [m: string]: number });
  }, [expenses, selectedYear]);

  // Monthly Net Profit for active year
  const monthlyNetProfit = useMemo(() => {
    return months.reduce((acc, m) => {
      acc[m] = (monthlyRevenue[m] || 0) - (monthlyExpensesTotal[m] || 0);
      return acc;
    }, {} as { [m: string]: number });
  }, [monthlyRevenue, monthlyExpensesTotal]);

  const totalAnnualRevenue = useMemo(() => {
    return (Object.values(monthlyRevenue) as number[]).reduce((a, b) => a + b, 0);
  }, [monthlyRevenue]);

  const totalAnnualExpenses = useMemo(() => {
    return (Object.values(monthlyExpensesTotal) as number[]).reduce((a, b) => a + b, 0);
  }, [monthlyExpensesTotal]);

  const totalAnnualNetProfit = totalAnnualRevenue - totalAnnualExpenses;
  const annualSavingsRate = totalAnnualRevenue > 0 ? (totalAnnualNetProfit / totalAnnualRevenue) * 100 : 0;

  // Multi-Year History Summary Data
  const multiYearSummary = useMemo(() => {
    return availableYears.map(yr => {
      let rev = 0;
      let exp = 0;
      months.forEach(m => {
        incomes.forEach(i => (rev += getIncomeValuesForYear(i, yr)[m] || 0));
        expenses.forEach(e => (exp += getExpenseValuesForYear(e, yr)[m] || 0));
      });
      const net = rev - exp;
      const rate = rev > 0 ? (net / rev) * 100 : 0;
      return { year: yr, revenue: rev, expense: exp, netProfit: net, savingsRate: rate };
    });
  }, [availableYears, incomes, expenses]);

  // Helper to extract passive monthly data for selected year (with auto-flow for stock portfolios)
  const getPassiveMonthData = (item: (typeof passiveAccounts)[0], year: number, month: string) => {
    const { isMy, isUs } = checkStockAccountType(item);
    const flowPrincipal = isMy
      ? getStockPrincipalForMonth('MY', year, month)
      : isUs
      ? getStockPrincipalForMonth('US', year, month)
      : 0;

    const defaultPrincipal = (isMy || isUs) ? flowPrincipal : (item.principalAmount || 0);
    const yrStr = year.toString();
    const yearly = item.yearlyData?.[yrStr]?.[month];

    if (isMy || isUs) {
      // Prioritize live stock portfolio valuation if available, otherwise 0 before acquisition
      const currentPrincipal = flowPrincipal;

      // Auto-fill dividend amount from Dividend Yield page for MY or US stock portfolio
      const autoDividend = isMy
        ? getStockDividendsForMonth('MY', year, month)
        : getStockDividendsForMonth('US', year, month);

      // Auto-calculate the particular month interest rate: (Dividend / Principal) * 100
      const autoRate = currentPrincipal > 0
        ? Number(((autoDividend / currentPrincipal) * 100).toFixed(2))
        : 0;

      const userOverride = yearly?.returns !== undefined ? yearly.returns : autoDividend;
      const userRate = yearly?.rate !== undefined ? yearly.rate : autoRate;

      return {
        principal: currentPrincipal,
        rate: autoRate > 0 ? autoRate : (userRate || 0),
        returns: autoDividend > 0 ? autoDividend : (userOverride || 0),
        isStockAutoLinked: isMy ? 'MY' : 'US'
      };
    }

    const currentPrincipal = yearly?.principal !== undefined ? yearly.principal : defaultPrincipal;
    const calcNotes = yearly?.calcNotes || item.monthlyCalcNotes?.[yrStr]?.[month] || '';

    if (yearly) {
      const r = yearly.rate ?? item.annualInterestRate ?? 0;
      const ret = yearly.returns ?? (item.yearlyReturns?.[yrStr]?.[month] ?? (year === 2026 ? item.monthlyReturns?.[month] : 0) ?? 0);
      let pVal = currentPrincipal;
      if (yearly.principal === undefined && r > 0 && ret > 0) {
        pVal = Math.round((ret * 12 / (r / 100)) * 100) / 100;
      }
      return {
        principal: pVal,
        rate: r,
        returns: ret,
        calcNotes,
        isStockAutoLinked: null
      };
    }
    const legacyYearlyRet = item.yearlyReturns?.[yrStr]?.[month];
    const ret = legacyYearlyRet !== undefined ? legacyYearlyRet : (year === 2026 ? item.monthlyReturns?.[month] || 0 : 0);
    const r = item.annualInterestRate || 0;
    let pVal = defaultPrincipal;
    if (r > 0 && ret > 0 && !item.principalAmount) {
      pVal = Math.round((ret * 12 / (r / 100)) * 100) / 100;
    }
    return {
      principal: pVal,
      rate: r,
      returns: ret,
      calcNotes,
      isStockAutoLinked: null
    };
  };

  // Passive Income Calculations per account for active year
  const passiveAccountMetrics = useMemo(() => {
    return passiveAccounts.map(account => {
      const monthRecords = months.map(m => getPassiveMonthData(account, selectedYear, m));
      const actualReturnsSum = monthRecords.reduce((sum, r) => sum + r.returns, 0);

      // Latest active principal in this year (search backwards from Dec)
      let latestPrincipal = account.principalAmount || 0;
      for (let i = monthRecords.length - 1; i >= 0; i--) {
        if (monthRecords[i].principal > 0) {
          latestPrincipal = monthRecords[i].principal;
          break;
        }
      }

      // Latest active rate in this year (search backwards from Dec)
      const { isMy, isUs } = checkStockAccountType(account);
      let latestRate = account.annualInterestRate || 0;
      if (isMy || isUs) {
        latestRate = latestPrincipal > 0 ? (actualReturnsSum / latestPrincipal) * 100 : 0;
      } else {
        for (let i = monthRecords.length - 1; i >= 0; i--) {
          if (monthRecords[i].rate > 0) {
            latestRate = monthRecords[i].rate;
            break;
          }
        }
      }

      const estAnnual = (latestPrincipal * latestRate) / 100;
      const effectiveAnnual = actualReturnsSum > 0 ? actualReturnsSum : estAnnual;
      const monthlyEst = effectiveAnnual / 12;

      return {
        account,
        monthRecords,
        actualReturnsSum,
        latestPrincipal,
        latestRate,
        effectiveAnnual,
        monthlyEst,
      };
    });
  }, [passiveAccounts, selectedYear, months]);

  const totalPassiveAnnualReturn = useMemo(() => {
    return passiveAccountMetrics.reduce((sum, m) => sum + m.effectiveAnnual, 0);
  }, [passiveAccountMetrics]);

  const monthlyPassiveAvg = totalPassiveAnnualReturn / 12;
  const currentFireGoal = fireTargetMonthly || 2000;
  const passiveMilestonePercent = currentFireGoal > 0 ? Math.min(100, (monthlyPassiveAvg / currentFireGoal) * 100) : 0;

  // Add Inflow / Expense
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    if (addCategoryType === 'income') {
      addIncomeCategory(newCatName.trim());
    } else {
      addExpenseCategory(newCatName.trim());
    }
    setNewCatName('');
    setShowAddCategoryModal(false);
  };

  // Add Passive Account directly without modal
  const handleAddDirectPassiveAccount = () => {
    addPassiveAccount({
      name: 'New Yield Account',
      category: 'Digital Bank',
      principalAmount: 10000,
      annualInterestRate: 3.5,
      monthlyReturns: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
      yearlyData: {
        [String(selectedYear)]: {
          Jan: { principal: 10000, rate: 3.5, returns: 0 },
          Feb: { principal: 10000, rate: 3.5, returns: 0 },
          Mar: { principal: 10000, rate: 3.5, returns: 0 },
          Apr: { principal: 10000, rate: 3.5, returns: 0 },
          May: { principal: 10000, rate: 3.5, returns: 0 },
          Jun: { principal: 10000, rate: 3.5, returns: 0 },
          Jul: { principal: 10000, rate: 3.5, returns: 0 },
          Aug: { principal: 10000, rate: 3.5, returns: 0 },
          Sep: { principal: 10000, rate: 3.5, returns: 0 },
          Oct: { principal: 10000, rate: 3.5, returns: 0 },
          Nov: { principal: 10000, rate: 3.5, returns: 0 },
          Dec: { principal: 10000, rate: 3.5, returns: 0 },
        }
      }
    });
  };

  // Expenses Drag & Drop Handlers
  const handleExpenseDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedExpenseId(id);
  };

  const handleExpenseDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverExpenseId !== id) {
      setDragOverExpenseId(id);
    }
  };

  const handleExpenseDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedExpenseId;
    if (!sourceId || sourceId === targetId) {
      setDraggedExpenseId(null);
      setDragOverExpenseId(null);
      return;
    }

    const fromIndex = expenses.findIndex(exp => exp.id === sourceId);
    const toIndex = expenses.findIndex(exp => exp.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...expenses];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setExpensesList(next);
    setExpenseSortOrder('none');
    setDraggedExpenseId(null);
    setDragOverExpenseId(null);
  };

  // Expenses Sort Handler (toggle Ascending / Descending / Default)
  const handleToggleSortExpenses = () => {
    let nextOrder: 'none' | 'asc' | 'desc' = 'asc';
    if (expenseSortOrder === 'none') nextOrder = 'asc';
    else if (expenseSortOrder === 'asc') nextOrder = 'desc';
    else if (expenseSortOrder === 'desc') nextOrder = 'none';

    setExpenseSortOrder(nextOrder);

    if (nextOrder === 'asc') {
      const sorted = [...expenses].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
      setExpensesList(sorted);
    } else if (nextOrder === 'desc') {
      const sorted = [...expenses].sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }));
      setExpensesList(sorted);
    }
  };

  // Income Drag & Drop Handlers
  const handleIncomeDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIncomeId(id);
  };

  const handleIncomeDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIncomeId !== id) {
      setDragOverIncomeId(id);
    }
  };

  const handleIncomeDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedIncomeId;
    if (!sourceId || sourceId === targetId) {
      setDraggedIncomeId(null);
      setDragOverIncomeId(null);
      return;
    }

    const fromIndex = incomes.findIndex(inc => inc.id === sourceId);
    const toIndex = incomes.findIndex(inc => inc.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...incomes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setIncomesList(next);
    setIncomeSortOrder('none');
    setDraggedIncomeId(null);
    setDragOverIncomeId(null);
  };

  // Income Sort Handler
  const handleToggleSortIncomes = () => {
    let nextOrder: 'none' | 'asc' | 'desc' = 'asc';
    if (incomeSortOrder === 'none') nextOrder = 'asc';
    else if (incomeSortOrder === 'asc') nextOrder = 'desc';
    else if (incomeSortOrder === 'desc') nextOrder = 'none';

    setIncomeSortOrder(nextOrder);

    if (nextOrder === 'asc') {
      const sorted = [...incomes].sort((a, b) => a.category.localeCompare(b.category, undefined, { sensitivity: 'base' }));
      setIncomesList(sorted);
    } else if (nextOrder === 'desc') {
      const sorted = [...incomes].sort((a, b) => b.category.localeCompare(a.category, undefined, { sensitivity: 'base' }));
      setIncomesList(sorted);
    }
  };

  // Passive Accounts Drag & Drop Handlers
  const handlePassiveDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPassiveId(id);
  };

  const handlePassiveDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPassiveId !== id) {
      setDragOverPassiveId(id);
    }
  };

  const handlePassiveDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedPassiveId;
    if (!sourceId || sourceId === targetId) {
      setDraggedPassiveId(null);
      setDragOverPassiveId(null);
      return;
    }

    const fromIndex = passiveAccounts.findIndex(p => p.id === sourceId);
    const toIndex = passiveAccounts.findIndex(p => p.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...passiveAccounts];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setPassiveAccountsList(next);
    setDraggedPassiveId(null);
    setDragOverPassiveId(null);
  };

  // Add New Year (via YearSelector)
  const handleAddYear = (year: number, cloneFrom?: number) => {
    if (!availableYears.includes(year)) {
      const next = [...availableYears, year].sort((a, b) => a - b);
      setAvailableYears(next);
      if (cloneFrom) {
        copyCashflowYear(cloneFrom, year);
      }
      setSelectedYear(year);
    }
  };

  // Delete Year (via YearSelector Right-Click)
  const handleDeleteYear = (year: number) => {
    if (availableYears.length <= 1) return;
    const next = availableYears.filter(y => y !== year);
    setAvailableYears(next);
    if (selectedYear === year) {
      setSelectedYear(next[next.length - 1]);
    }
  };

  const formatRM = (num: number) => `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatUSD = (num: number) => `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div id="cashflow-planner-section" className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header & Sub-tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cashflow'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Income Statement</span>
          </button>
          <button
            onClick={() => setActiveTab('passive')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'passive'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-blue-600" />
            <span>Passive Income</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <YearSelector
            years={availableYears}
            selectedYear={selectedYear}
            onSelectYear={yr => typeof yr === 'number' && setSelectedYear(yr)}
            onAddYear={handleAddYear}
            onDeleteYear={handleDeleteYear}
            label="Year"
          />
        </div>
      </div>

      {/* ================= TAB 1: INCOME STATEMENT (MONTHLY CASH FLOW) ================= */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          {/* Historical Cash Flow Comparison Chart & Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 text-blue-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">Historical Cash Flow Comparison</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600" /> Annual Revenue
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-600 ml-1" /> Annual Outflow
              </div>
            </div>

            {/* Interactive Composed / Bar Chart */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 font-bold px-1">
                <span>(RM)</span>
              </div>
              <div className="h-72 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={multiYearSummary}
                    margin={{ top: 10, right: 16, bottom: 0, left: 10 }}
                    barCategoryGap="28%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="year" stroke="#64748B" fontSize={11} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tick={{ fill: '#64748B' }}
                      tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toLocaleString())}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '12px',
                        color: '#0F172A',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                      formatter={(value: any, name: any) => [formatRM(Number(value)), name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                      name="Annual Revenue"
                    />
                    <Bar
                      dataKey="expense"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                      name="Annual Outflow"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Historical Data Comparison Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">Year</th>
                    <th className="py-3 px-4 text-right">Annual Revenue</th>
                    <th className="py-3 px-4 text-right">Annual Outflow</th>
                    <th className="py-3 px-4 text-right">Net Savings</th>
                    <th className="py-3 px-4 text-right">Savings Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-900 bg-white">
                  {multiYearSummary.map(row => {
                    const isSelected = row.year === selectedYear;
                    return (
                      <tr
                        key={row.year}
                        onClick={() => setSelectedYear(row.year)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50 font-semibold' : 'hover:bg-gray-50'
                        }`}
                        title="Click to view this year in monthly breakdown below"
                      >
                        <td className="py-3 px-4 font-bold text-gray-900 font-mono text-xs flex items-center gap-2">
                          <span>{row.year}</span>
                          {isSelected && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-blue-600 text-white rounded font-sans font-bold">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                          {formatRM(row.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                          {formatRM(row.expense)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${row.netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {formatRM(row.netProfit)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-gray-900">
                          {row.savingsRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unified Income Statement Table (Revenue & Expenses Combined) */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            {/* Top Toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight uppercase">
                  INCOME STATEMENT ({selectedYear})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAddCategoryType('income');
                    setNewCatName('');
                    setShowAddCategoryModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Inflow / Outflow</span>
                </button>
              </div>
            </div>

            {/* Combined Table Content */}
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh] no-scrollbar touch-scroll relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
                  <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 min-w-[220px] max-w-[280px] select-none sticky left-0 top-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-1.5">
                        <span>Category</span>
                      </div>
                    </th>
                    {months.map(m => (
                      <th key={m} className="py-3 px-2 text-right min-w-[90px]">{m}</th>
                    ))}
                    <th className="py-3 px-4 text-right min-w-[120px] whitespace-nowrap bg-gray-100/70 font-bold text-gray-900">
                      Total ({selectedYear})
                    </th>
                    <th className="py-3 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-900 font-medium bg-white">
                  {/* --- SECTION 1: REVENUE (INFLOW) HEADER --- */}
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <td colSpan={months.length + 3} className="py-2.5 px-4 font-bold text-xs text-emerald-600 uppercase tracking-wider sticky left-0 z-10 bg-gray-50">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span>REVENUE (INFLOW)</span>
                      </div>
                    </td>
                  </tr>

                  {/* Revenue Rows */}
                  {incomes.map((inc) => {
                    const vals = getIncomeValuesForYear(inc, selectedYear);
                    const rowSum = (Object.values(vals) as number[]).reduce((a, b) => a + b, 0);
                    const isDragging = draggedIncomeId === inc.id;
                    const isDragOver = dragOverIncomeId === inc.id;

                    return (
                      <tr
                        key={inc.id}
                        draggable
                        onDragStart={e => handleIncomeDragStart(e, inc.id)}
                        onDragOver={e => handleIncomeDragOver(e, inc.id)}
                        onDrop={e => handleIncomeDrop(e, inc.id)}
                        onDragEnd={() => {
                          setDraggedIncomeId(null);
                          setDragOverIncomeId(null);
                        }}
                        className={`transition-colors group ${
                          isDragging ? 'opacity-40 bg-gray-50' : isDragOver ? 'bg-emerald-50/60 border-t-2 border-emerald-500' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <td className="py-2 px-4 font-semibold text-gray-900 min-w-[220px] max-w-[280px] whitespace-normal break-words sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] pl-6">
                          <textarea
                            rows={inc.category.length > 24 ? 2 : 1}
                            value={inc.category}
                            onChange={e => updateIncomeCategoryName(inc.id, e.target.value)}
                            placeholder="Income stream name"
                            className="w-full font-bold text-xs text-gray-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-emerald-500 rounded-lg px-2 py-1 focus:outline-none transition-all cursor-text resize-none whitespace-normal break-words leading-snug"
                          />
                        </td>
                        {months.map(m => (
                          <td key={m} className="py-2 px-1 text-right font-mono min-w-[90px]">
                            <FormattedNumberInput
                              value={vals[m] !== undefined && vals[m] !== null ? vals[m] : 0}
                              onChange={v => updateIncomeForYear(inc.id, selectedYear, m, v)}
                              className="w-full text-right py-1 px-1.5 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-emerald-500 rounded-lg focus:outline-none transition-all font-mono tabular-nums text-gray-900"
                            />
                          </td>
                        ))}
                        <td className="py-2 px-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30 whitespace-nowrap tabular-nums">
                          {formatRM(rowSum)}
                        </td>
                        <td className="py-2 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteIncomeCategory(inc.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Revenue Subtotal Row */}
                  <tr className="bg-emerald-50/40 border-t border-b-2 border-emerald-200 font-extrabold text-gray-900">
                    <td className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-emerald-700 sticky left-0 z-10 bg-emerald-50/80 border-r border-emerald-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[220px]">
                      TOTAL REVENUE
                    </td>
                    {months.map(m => (
                      <td key={m} className="py-2.5 px-2 text-right font-mono text-emerald-600 whitespace-nowrap tabular-nums">
                        {monthlyRevenue[m] ? formatRM(monthlyRevenue[m]) : '-'}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-700 bg-emerald-100/60 text-xs whitespace-nowrap tabular-nums">
                      {formatRM(totalAnnualRevenue)}
                    </td>
                    <td></td>
                  </tr>

                  {/* --- SECTION 2: EXPENSES (OUTFLOW) HEADER --- */}
                  <tr className="bg-gray-50/70 border-b border-gray-100">
                    <td colSpan={months.length + 3} className="py-2.5 px-4 font-bold text-xs text-rose-600 uppercase tracking-wider sticky left-0 z-10 bg-gray-50 pt-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-600" />
                        <span>EXPENSES (OUTFLOW)</span>
                      </div>
                    </td>
                  </tr>

                  {/* Expenses Rows */}
                  {expenses.map((exp) => {
                    const vals = getExpenseValuesForYear(exp, selectedYear);
                    const rowSum = (Object.values(vals) as number[]).reduce((a, b) => a + b, 0);
                    const isDragging = draggedExpenseId === exp.id;
                    const isDragOver = dragOverExpenseId === exp.id;

                    return (
                      <tr
                        key={exp.id}
                        draggable
                        onDragStart={e => handleExpenseDragStart(e, exp.id)}
                        onDragOver={e => handleExpenseDragOver(e, exp.id)}
                        onDrop={e => handleExpenseDrop(e, exp.id)}
                        onDragEnd={() => {
                          setDraggedExpenseId(null);
                          setDragOverExpenseId(null);
                        }}
                        className={`transition-colors group ${
                          isDragging ? 'opacity-40 bg-gray-50' : isDragOver ? 'bg-rose-50/60 border-t-2 border-rose-500' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <td className="py-2 px-4 font-semibold text-gray-900 min-w-[220px] max-w-[280px] whitespace-normal break-words sticky left-0 z-10 bg-white group-hover:bg-gray-50/60 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] pl-6">
                          <textarea
                            rows={exp.name.length > 24 ? 2 : 1}
                            value={exp.name}
                            onChange={e => updateExpenseCategoryName(exp.id, e.target.value)}
                            placeholder="Expense item name"
                            className="w-full font-bold text-xs text-gray-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-rose-500 rounded-lg px-2 py-1 focus:outline-none transition-all cursor-text resize-none whitespace-normal break-words leading-snug"
                          />
                        </td>
                        {months.map(m => (
                          <td key={m} className="py-2 px-1 text-right font-mono min-w-[90px]">
                            <FormattedNumberInput
                              value={vals[m] !== undefined && vals[m] !== null ? vals[m] : 0}
                              onChange={v => updateExpenseForYear(exp.id, selectedYear, m, v)}
                              className="w-full text-right py-1 px-1.5 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-rose-500 rounded-lg focus:outline-none transition-all font-mono tabular-nums text-gray-900"
                            />
                          </td>
                        ))}
                        <td className="py-2 px-4 text-right font-mono font-bold text-rose-600 bg-rose-50/30 whitespace-nowrap tabular-nums">
                          {formatRM(rowSum)}
                        </td>
                        <td className="py-2 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteExpenseCategory(exp.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Expenses Subtotal Row */}
                  <tr className="bg-rose-50/40 border-t border-b-2 border-rose-200 font-extrabold text-gray-900">
                    <td className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-rose-700 sticky left-0 z-10 bg-rose-50/80 border-r border-rose-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[220px]">
                      TOTAL EXPENSES
                    </td>
                    {months.map(m => (
                      <td key={m} className="py-2.5 px-2 text-right font-mono text-rose-600 whitespace-nowrap tabular-nums">
                        {monthlyExpensesTotal[m] ? formatRM(monthlyExpensesTotal[m]) : '-'}
                      </td>
                    ))}
                    <td className="py-2.5 px-4 text-right font-mono font-extrabold text-rose-700 bg-rose-100/60 text-xs whitespace-nowrap tabular-nums">
                      {formatRM(totalAnnualExpenses)}
                    </td>
                    <td></td>
                  </tr>

                  {/* --- SECTION 3: NET SURPLUS / DEFICIT (GRAND TOTAL) --- */}
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-extrabold text-gray-900">
                    <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-blue-700 sticky left-0 z-10 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[220px]">
                      NET CASH FLOW (SURPLUS / DEFICIT)
                    </td>
                    {months.map(m => {
                      const net = monthlyNetProfit[m] || 0;
                      return (
                        <td key={m} className={`py-3 px-2 text-right min-w-[90px] font-mono whitespace-nowrap tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatRM(net)}
                        </td>
                      );
                    })}
                    <td className={`py-3 px-4 text-right font-mono font-extrabold text-sm whitespace-nowrap tabular-nums bg-gray-100 ${totalAnnualNetProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {formatRM(totalAnnualNetProfit)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: PASSIVE YIELD ACCOUNTS ================= */}
      {activeTab === 'passive' && (
        <div className="space-y-6">
          {/* FIRE Target Goal Banner */}
          <div className="bg-gray-900 text-white p-5 rounded-2xl border border-gray-800 shadow-md space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-blue-400">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">FIRE Target</h3>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-gray-400">Current Passive Income:</span>
                  <strong className="text-white font-mono text-sm">{formatRM(monthlyPassiveAvg)}</strong>
                  <span className="text-gray-500 font-bold">/</span>
                  <span className="text-blue-400 font-mono font-bold">RM</span>
                  <FormattedNumberInput
                    value={fireTargetMonthly || ''}
                    onChange={v => setFireTargetMonthly(v)}
                    className="w-20 px-1 py-0.5 bg-transparent border-b border-blue-400/60 hover:border-blue-400 focus:border-blue-400 text-blue-400 font-mono text-xs font-bold focus:outline-none transition-colors text-center"
                    placeholder="2,000"
                  />
                  <span className="text-gray-400">per month</span>
                </div>
                <span className="font-bold text-blue-400 font-mono">
                  {passiveMilestonePercent.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden p-0.5 border border-gray-700">
                <div
                  className="bg-linear-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${passiveMilestonePercent}%` }}
                />
              </div>

              {/* Status Traffic Light Indicator */}
              {(() => {
                const target = fireTargetMonthly || 2000;
                const percent = target > 0 ? (monthlyPassiveAvg / target) * 100 : 0;
                const isGreen = percent >= 100;
                const isYellow = !isGreen && percent >= 60;
                const isRed = percent < 60;

                return (
                  <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs border-t border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        {/* Traffic light indicator circle */}
                        <div
                          className={`w-3.5 h-3.5 rounded-full transition-all shrink-0 ${
                            isGreen
                              ? 'bg-emerald-500 ring-2 ring-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
                              : isYellow
                              ? 'bg-amber-500 ring-2 ring-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                              : 'bg-rose-500 ring-2 ring-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                          }`}
                        />
                        <span className={`font-bold text-xs ${
                          isGreen ? 'text-emerald-400' : isYellow ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {isGreen
                            ? 'Your Money On the Right Track'
                            : isYellow
                            ? 'Your Money Can Work Harder'
                            : 'Put Your Money Back to Work'}
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      {isGreen ? (
                        <span className="text-emerald-400">
                          Annualized: {formatRM(monthlyPassiveAvg * 12)} / year ({percent.toFixed(1)}% of target)
                        </span>
                      ) : isYellow ? (
                        <span className="text-amber-400">
                          Annualized: {formatRM(monthlyPassiveAvg * 12)} / yr · Gap: {formatRM(Math.max(0, (target - monthlyPassiveAvg) * 12))}/yr
                        </span>
                      ) : (
                        <span className="text-rose-400">
                          Annualized: {formatRM(monthlyPassiveAvg * 12)} / yr · Shortfall: {formatRM(Math.max(0, (target - monthlyPassiveAvg) * 12))}/yr
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Passive Accounts Grid (Summary Cards linked directly to detailed ledger) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passiveAccountMetrics.map(({ account, latestPrincipal, latestRate, monthlyEst }) => {
              const { isUs } = checkStockAccountType(account);
              return (
                <div key={account.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3 relative group hover:border-gray-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-gray-900">{account.name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-emerald-600 font-mono bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        {latestRate.toFixed(2)}% p.a.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">Principal ({isUs ? 'USD' : 'RM'})</span>
                      <span className="font-mono font-bold text-gray-900">{isUs ? formatUSD(latestPrincipal) : formatRM(latestPrincipal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase font-bold">Est. Monthly Return</span>
                      <span className="font-mono font-bold text-emerald-600">{isUs ? formatUSD(monthlyEst) : formatRM(monthlyEst)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly Passive Yield Detailed Matrix Ledger */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase">
                  Passive Income Ledger ({selectedYear})
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddDirectPassiveAccount}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar touch-scroll">
              <div className="divide-y divide-gray-200">
                {passiveAccounts.map((account) => {
                  const rowSum = months.reduce((sum, m) => sum + getPassiveMonthData(account, selectedYear, m).returns, 0);
                  const { isMy, isUs } = checkStockAccountType(account);
                  const isDigitalBankOrFreeCash = (account.id === 'p_digibank' || /digital bank|free cash/i.test(account.name)) && !/versa/i.test(account.name);
                  const isDragging = draggedPassiveId === account.id;
                  const isDragOver = dragOverPassiveId === account.id;

                  return (
                    <div
                      key={account.id}
                      draggable
                      onDragStart={e => handlePassiveDragStart(e, account.id)}
                      onDragOver={e => handlePassiveDragOver(e, account.id)}
                      onDrop={e => handlePassiveDrop(e, account.id)}
                      onDragEnd={() => {
                        setDraggedPassiveId(null);
                        setDragOverPassiveId(null);
                      }}
                      className={`p-3 space-y-2 transition-all group ${
                        isDragging
                          ? 'opacity-40 bg-gray-50'
                          : isDragOver
                          ? 'bg-blue-50/60 border-t-2 border-blue-600'
                          : 'hover:bg-gray-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Hidden/Subtle Drag Handle */}
                            <div
                              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-400 hover:text-blue-600 opacity-40 group-hover:opacity-100 transition-opacity"
                              title="Click and drag to reorder"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <input
                              type="text"
                              value={account.name}
                              onChange={e => updatePassiveAccount(account.id, { name: e.target.value })}
                              className="font-bold text-sm text-gray-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-600 rounded-md px-2 py-0.5 focus:outline-none transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold font-mono ${isMy || isUs ? 'text-indigo-600' : 'text-emerald-600'}`}>
                            Annual Dividend: {isUs ? formatUSD(rowSum) : formatRM(rowSum)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deletePassiveAccount(account.id)}
                            className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto no-scrollbar touch-scroll relative">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-20 bg-gray-50">
                            <tr className="text-gray-500 font-bold uppercase text-[9px] border-b border-gray-200">
                              <th className="py-1 px-2 w-32 min-w-[140px] sticky left-0 top-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Metric</th>
                              {months.map(m => (
                                <th key={m} className="py-1 px-1.5 text-right min-w-[85px]">{m}</th>
                              ))}
                              <th className="py-1 px-2 text-right min-w-[110px] whitespace-nowrap bg-gray-50">Total / Dec</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {/* Row 1: Principal */}
                            <tr>
                              <td className="py-1 px-2 font-bold text-gray-700 whitespace-nowrap sticky left-0 z-10 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                <span>Principal ({isUs ? 'USD' : 'RM'})</span>
                              </td>
                              {months.map(m => {
                                const val = getPassiveMonthData(account, selectedYear, m).principal;
                                return (
                                  <td key={m} className="py-0.5 px-1 text-right font-mono min-w-[85px]">
                                    <FormattedNumberInput
                                      value={val || 0}
                                      onChange={v => {
                                        updatePassiveAccountMonthData(account.id, selectedYear, m, 'principal', v);
                                      }}
                                      className={`w-full text-right py-1 px-1.5 text-xs rounded-lg focus:outline-none transition-all font-mono tabular-nums ${
                                        isMy || isUs
                                          ? 'text-indigo-600 font-bold bg-transparent'
                                          : 'text-gray-900 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-blue-600'
                                      }`}
                                    />
                                  </td>
                                );
                              })}
                              <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                                isMy || isUs ? 'text-indigo-600' : 'text-gray-900'
                              }`}>
                                {isUs
                                  ? formatUSD(getPassiveMonthData(account, selectedYear, 'Dec').principal)
                                  : formatRM(getPassiveMonthData(account, selectedYear, 'Dec').principal)}
                              </td>
                            </tr>
                            {/* Row 2: Rate */}
                            <tr>
                              <td className="py-1 px-2 font-bold text-gray-700 whitespace-nowrap sticky left-0 z-10 bg-white border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                <span>Rate (% p.a.)</span>
                              </td>
                              {months.map(m => {
                                const monthData = getPassiveMonthData(account, selectedYear, m);
                                const isAuto = Boolean(monthData.isStockAutoLinked);
                                return (
                                  <td key={m} className="py-0.5 px-1 text-right font-mono min-w-[85px]">
                                    <FormattedNumberInput
                                      value={monthData.rate || 0}
                                      readOnly={isAuto}
                                      maxDecimals={4}
                                      onChange={v => {
                                        if (isAuto) return;
                                        updatePassiveAccountMonthData(account.id, selectedYear, m, 'rate', v);
                                      }}
                                      className={`w-full text-right py-1 px-1.5 text-xs rounded-lg focus:outline-none transition-all font-mono font-bold tabular-nums ${
                                        isAuto
                                          ? 'bg-transparent cursor-default select-all text-indigo-600'
                                          : 'bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-gray-200 focus:border-emerald-500 text-emerald-600'
                                      }`}
                                    />
                                  </td>
                                );
                              })}
                              <td className={`py-1 px-2 text-right font-mono font-bold whitespace-nowrap tabular-nums ${
                                isMy || isUs ? 'text-indigo-600' : 'text-emerald-600'
                              }`}>
                                {(() => {
                                  const latestP = getPassiveMonthData(account, selectedYear, 'Dec').principal || account.principalAmount || 0;
                                  if ((isMy || isUs) && latestP > 0) {
                                    return `${((rowSum / latestP) * 100).toFixed(2)}%`;
                                  }
                                  return `${(months.reduce((sum, m) => sum + getPassiveMonthData(account, selectedYear, m).rate, 0) / 12).toFixed(2)}%`;
                                })()}
                              </td>
                            </tr>
                            {/* Row 3: Dividend */}
                            <tr className="bg-emerald-50/20">
                              <td className="py-1 px-2 font-bold text-emerald-700 whitespace-nowrap sticky left-0 z-10 bg-emerald-50/40 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                                <span>Dividend ({isUs ? 'USD' : 'RM'})</span>
                              </td>
                              {months.map(m => {
                                const monthData = getPassiveMonthData(account, selectedYear, m);
                                const isAuto = Boolean(monthData.isStockAutoLinked);
                                const hasNotes = Boolean(monthData.calcNotes && monthData.calcNotes.trim());
                                const displayVal = monthData.returns || 0;

                                if (isAuto) {
                                  return (
                                    <td key={m} className="py-0.5 px-1 text-right font-mono min-w-[85px]">
                                      <FormattedNumberInput
                                        value={monthData.returns || 0}
                                        readOnly
                                        className="w-full text-right py-1 px-1.5 text-xs rounded-lg focus:outline-none transition-all font-mono font-bold tabular-nums text-indigo-600 bg-transparent cursor-default select-all"
                                      />
                                    </td>
                                  );
                                }

                                if (isDigitalBankOrFreeCash) {
                                  return (
                                    <td key={m} className="py-0.5 px-1 text-right font-mono min-w-[85px]">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveLedgerCalc({
                                            isOpen: true,
                                            accountId: account.id,
                                            accountName: account.name,
                                            month: m,
                                            year: selectedYear,
                                            currency: isUs ? 'USD' : 'RM',
                                            initialNotes: monthData.calcNotes || '',
                                            initialValue: displayVal
                                          });
                                        }}
                                        title={
                                          hasNotes
                                            ? `Breakdown:\n${monthData.calcNotes}\n\nTotal: ${isUs ? formatUSD(displayVal) : formatRM(displayVal)}\n(Click to open mini calculator)`
                                            : `Click to open mini calculator for ${m} ${selectedYear}`
                                        }
                                        className="w-full text-right py-1 px-1.5 text-xs rounded-lg transition-all font-mono font-bold tabular-nums flex items-center justify-end cursor-pointer bg-transparent text-emerald-600 hover:bg-white hover:border-emerald-200 border border-transparent focus:border-emerald-500"
                                      >
                                        <span className="truncate">
                                          {displayVal !== 0 ? displayVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : 0}
                                        </span>
                                      </button>
                                    </td>
                                  );
                                }

                                // Standard accounts like Versa Cash & Yield or ASB: direct numerical input, no calculator modal
                                return (
                                  <td key={m} className="py-0.5 px-1 text-right font-mono min-w-[85px]">
                                    <FormattedNumberInput
                                      value={monthData.returns || 0}
                                      onChange={v => {
                                        updatePassiveAccountMonthData(account.id, selectedYear, m, 'returns', v);
                                      }}
                                      className="w-full text-right py-1 px-1.5 text-xs rounded-lg focus:outline-none transition-all font-mono font-bold tabular-nums text-emerald-600 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-emerald-200 focus:border-emerald-500"
                                    />
                                  </td>
                                );
                              })}
                              <td className="py-1 px-2 text-right font-mono font-extrabold text-emerald-600 whitespace-nowrap tabular-nums">
                                {isUs ? formatUSD(rowSum) : formatRM(rowSum)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Matrix Total Summary Footer */}
              <div className="bg-emerald-50/40 border-t-2 border-emerald-200 p-3">
                <div className="overflow-x-auto no-scrollbar touch-scroll relative">
                  <table className="w-full text-left text-xs border-collapse font-bold">
                    <tbody>
                      {/* Total Portfolio Principal */}
                      <tr className="text-gray-900">
                        <td className="py-2 px-2 w-36 min-w-[140px] uppercase text-[10px] text-gray-600 font-bold whitespace-nowrap sticky left-0 z-10 bg-emerald-50/60 border-r border-emerald-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                          <div className="flex items-center gap-1.5">
                            <span>Total Principal</span>
                            <button
                              type="button"
                              onClick={() => setShowPrincipalSelectorModal(true)}
                              className="inline-flex items-center justify-center text-blue-600 hover:text-blue-700 transition-colors cursor-pointer shrink-0"
                              title="Click to select which accounts are included in Total Principal"
                              aria-label="Customize Total Principal accounts"
                            >
                              <Info className="w-3 h-3 stroke-[1.8]" />
                            </button>
                          </div>
                        </td>
                        {months.map(m => {
                          const mSum = passiveAccounts
                            .filter(a => includedPrincipalAccountIds.includes(a.id))
                            .reduce((sum, a) => sum + getPassiveMonthData(a, selectedYear, m).principal, 0);
                          return (
                            <td key={m} className="py-1.5 px-1.5 text-right font-mono text-gray-900 min-w-[85px] whitespace-nowrap tabular-nums">
                              {mSum > 0 ? formatRM(mSum) : '-'}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right font-mono text-gray-900 font-bold min-w-[110px] whitespace-nowrap tabular-nums">
                          {formatRM(
                            passiveAccounts
                              .filter(a => includedPrincipalAccountIds.includes(a.id))
                              .reduce((sum, a) => sum + getPassiveMonthData(a, selectedYear, 'Dec').principal, 0)
                          )}
                        </td>
                      </tr>
                      {/* Total Monthly Passive Income */}
                      <tr className="text-emerald-700">
                        <td className="py-1.5 px-2 w-32 min-w-[140px] uppercase text-[10px] text-emerald-700 whitespace-nowrap sticky left-0 z-10 bg-emerald-50/60 border-r border-emerald-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Total Passive Income</td>
                        {months.map(m => {
                          const mSum = passiveAccounts.reduce((sum, a) => sum + getPassiveMonthData(a, selectedYear, m).returns, 0);
                          return (
                            <td key={m} className="py-1.5 px-1.5 text-right font-mono text-emerald-600 min-w-[85px] whitespace-nowrap tabular-nums">
                              {mSum > 0 ? formatRM(mSum) : '-'}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700 font-extrabold text-sm min-w-[110px] whitespace-nowrap tabular-nums">
                          {formatRM(
                            passiveAccounts.reduce((sum, a) => {
                              const rSum = months.reduce((acc, m) => acc + getPassiveMonthData(a, selectedYear, m).returns, 0);
                              return sum + rSum;
                            }, 0)
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD INFLOW / OUTFLOW UNIFIED MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Add Inflow / Outflow</h3>
              <button 
                onClick={() => setShowAddCategoryModal(false)} 
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector toggle */}
            <div className="flex items-center p-1 bg-gray-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setAddCategoryType('income')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addCategoryType === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                <span>Inflow Stream</span>
              </button>
              <button
                type="button"
                onClick={() => setAddCategoryType('expense')}
                className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  addCategoryType === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-300"></span>
                <span>Outflow Stream</span>
              </button>
            </div>

            <form onSubmit={handleAddCategorySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {addCategoryType === 'income' ? 'Inflow Stream Name' : 'Outflow Stream Name'}
                </label>
                <input
                  type="text"
                  placeholder={
                    addCategoryType === 'income'
                      ? 'e.g. Freelance Consulting, Rental Income'
                      : 'e.g. Car Maintenance, Insurance, Utilities'
                  }
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 text-gray-900 ${
                    addCategoryType === 'income' ? 'focus:ring-emerald-500' : 'focus:ring-rose-500'
                  }`}
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                    addCategoryType === 'income'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {addCategoryType === 'income' ? 'Add Inflow Stream' : 'Add Outflow Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* TOTAL PRINCIPAL SELECTOR MODAL */}
      {showPrincipalSelectorModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Total Principal Inclusion</h3>
                  <p className="text-[11px] text-gray-500">
                    Select which accounts contribute to the Total Principal row for {selectedYear}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrincipalSelectorModal(false)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selection Quick Actions */}
            <div className="flex items-center justify-between gap-2 text-xs pt-1">
              <span className="text-[11px] font-bold text-gray-500">
                {includedPrincipalAccountIds.length} of {passiveAccounts.length} accounts included
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllPrincipalAccounts}
                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllPrincipalAccounts}
                  className="px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  type="button"
                  onClick={selectAllPrincipalAccounts}
                  className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Reset Default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Account List */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1 py-1 max-h-[340px]">
              {passiveAccounts.map(account => {
                const isIncluded = includedPrincipalAccountIds.includes(account.id);
                const { isMy, isUs } = checkStockAccountType(account);
                const decPrincipal = getPassiveMonthData(account, selectedYear, 'Dec').principal;

                return (
                  <div
                    key={account.id}
                    onClick={() => toggleIncludeAccount(account.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isIncluded
                        ? 'bg-blue-50/30 border-blue-200 shadow-xs'
                        : 'bg-gray-50/60 border-gray-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                          isIncluded
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {isIncluded && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {account.name}
                          </span>
                          {isMy && (
                            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                              MY Stock
                            </span>
                          )}
                          {isUs && (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                              US Stock
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 block">
                          {account.category || 'Passive Yield'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap pl-2">
                      <span className="font-mono font-bold text-xs text-gray-900 block">
                        {isUs ? formatUSD(decPrincipal) : formatRM(decPrincipal)}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">Dec {selectedYear}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Total Principal Footer */}
            <div className="bg-blue-50/60 border border-blue-100 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-700 font-bold uppercase text-[10px] tracking-wider">
                  Combined Total Principal ({selectedYear} Dec)
                </span>
                <span className="font-mono font-extrabold text-sm text-blue-700 tabular-nums">
                  {formatRM(
                    passiveAccounts
                      .filter(a => includedPrincipalAccountIds.includes(a.id))
                      .reduce((sum, a) => sum + getPassiveMonthData(a, selectedYear, 'Dec').principal, 0)
                  )}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowPrincipalSelectorModal(false)}
                className="w-full py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xs cursor-pointer text-center"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Ledger & Mini Calculator Modal */}
      {activeLedgerCalc && activeLedgerCalc.isOpen && (
        <LedgerCalculatorModal
          isOpen={activeLedgerCalc.isOpen}
          onClose={() => setActiveLedgerCalc(null)}
          accountName={activeLedgerCalc.accountName}
          month={activeLedgerCalc.month}
          year={activeLedgerCalc.year}
          currency={activeLedgerCalc.currency}
          initialNotes={activeLedgerCalc.initialNotes}
          initialValue={activeLedgerCalc.initialValue}
          onSave={(notes, total) => {
            updatePassiveAccountCalcNotes(
              activeLedgerCalc.accountId,
              activeLedgerCalc.year,
              activeLedgerCalc.month,
              notes,
              total
            );
          }}
        />
      )}
    </div>
  );
};
