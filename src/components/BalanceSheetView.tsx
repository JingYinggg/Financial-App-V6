import React, { useState, useMemo } from 'react';
import { useWealth } from '../context/WealthContext';
import {
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  DollarSign,
  Copy,
  Link2,
  Info
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
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { YearSelector } from './YearSelector';

export const BalanceSheetView: React.FC = () => {
  const {
    balanceSheet,
    updateBalanceSheetCell,
    addBalanceSheetCategory,
    updateBalanceSheetCategory,
    deleteBalanceSheetCategory,
    addBalanceSheetYear,
    deleteBalanceSheetYear,
    cloneBalanceSheetYear,
    syncBalanceSheetFromTabs,
    annualReports,
    investmentReports,
    updateAnnualReport,
    addAnnualReport,
    updateInvestmentReport,
    addInvestmentReport,
    holdings,
    stockValuations,
    passiveAccounts,
    includedPrincipalAccountIds,
    dividends,
  } = useWealth();

  // Year filter for focused viewing or ALL years
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'tables' | 'charts'>('tables');

  // Share investment breakdown modal state (flowing directly from stock portfolio)
  const [shareBreakdownYear, setShareBreakdownYear] = useState<number | null>(null);

  // Inline editing for balance sheet cell
  const [editingCell, setEditingCell] = useState<{ itemId: string; year: string } | null>(null);
  const [cellInputVal, setCellInputVal] = useState<string>('');

  // Add category state
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'asset' | 'liability'>('asset');

  // Sync feedback
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Calculate live Share Investment values & stock breakdowns flowing directly from Stock Portfolio
  const stockPortfolioValuesByYear = useMemo(() => {
    const res: Record<string, { total: number; count: number; stocks: { name: string; code: string; market: string; value: number; currency: string; units?: number; price?: number }[] }> = {};
    
    balanceSheet.years.forEach(yr => {
      const yrValuations = stockValuations.filter(v => v.year === yr);
      const stocksList: { name: string; code: string; market: string; value: number; currency: string; units?: number; price?: number }[] = [];
      let yrTotal = 0;

      if (yrValuations.length > 0) {
        yrValuations.forEach(v => {
          const unitPrice = (v.endOfYearValue !== undefined && v.endOfYearValue > 0)
            ? v.endOfYearValue
            : (v.startOfYearValue || 0);

          const matchingHoldings = holdings.filter(h => 
            (v.code && h.code.toUpperCase() === v.code.toUpperCase()) || 
            h.name.toLowerCase() === v.stockName.toLowerCase()
          );
          const totalUnits = matchingHoldings.reduce((sum, h) => sum + h.units, 0);
          const effectiveUnits = totalUnits > 0 ? totalUnits : 1;
          const val = unitPrice * effectiveUnits;

          const isUSD = v.currency === 'USD' || v.market === 'US';
          const valInMYR = isUSD ? val * 4.45 : val;
          yrTotal += valInMYR;
          stocksList.push({
            name: v.stockName,
            code: v.code,
            market: v.market,
            value: val,
            currency: isUSD ? 'USD' : 'MYR',
            units: totalUnits > 0 ? totalUnits : undefined,
            price: unitPrice
          });
        });
      } else {
        // Derive from active holdings for current/recent year
        holdings.forEach(h => {
          const price = h.currentPrice ?? h.buyUnitPrice;
          const val = h.units * price;
          const isUSD = h.market === 'US';
          const valInMYR = isUSD ? val * 4.45 : val;
          yrTotal += valInMYR;
          stocksList.push({
            name: h.name,
            code: h.code,
            market: h.market,
            value: val,
            currency: isUSD ? 'USD' : 'MYR',
            units: h.units,
            price: price,
          });
        });
      }

      res[yr.toString()] = {
        total: yrTotal,
        count: stocksList.length,
        stocks: stocksList,
      };
    });

    return res;
  }, [balanceSheet.years, stockValuations, holdings]);

  // Formatting helpers
  const formatRM = (val: number | undefined) => {
    const num = Number(val) || 0;
    if (num < 0) {
      return `(RM ${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    return `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatUSD = (val: number | undefined) => {
    const num = Number(val) || 0;
    if (num < 0) {
      return `($ ${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
    }
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (val: number | undefined) => {
    const num = Number(val) || 0;
    return `${num >= 0 ? '' : ''}${num.toFixed(2)}%`;
  };

  // Sort years in descending order (2026, 2025, 2024, 2023) as in Attachment 0
  const displayedYears = useMemo(() => {
    const yrs = [...balanceSheet.years].sort((a, b) => b - a);
    if (selectedYear !== 'ALL') {
      return yrs.filter(y => y === selectedYear);
    }
    return yrs;
  }, [balanceSheet.years, selectedYear]);

  // Calculate dynamic ASNB values per year flowing from sum of ASM 1, ASM 2, and ASM 3 Dec principal
  const asnbValuesByYear = useMemo(() => {
    const res: Record<string, number> = {};
    const asmAccounts = passiveAccounts.filter(p => {
      const name = p.name.toUpperCase();
      return name.includes('ASM') || p.category === 'ASNB';
    });

    balanceSheet.years.forEach(yr => {
      const yrStr = yr.toString();
      let totalDecPrincipal = 0;
      let hasData = false;

      asmAccounts.forEach(account => {
        const decData = account.yearlyData?.[yrStr]?.['Dec'];
        if (decData && decData.principal !== undefined && decData.principal > 0) {
          totalDecPrincipal += decData.principal;
          hasData = true;
        } else if (account.principalAmount && account.principalAmount > 0) {
          // If no specific yearly Dec override is present, fallback to account principalAmount
          totalDecPrincipal += account.principalAmount;
          hasData = true;
        }
      });

      if (hasData && totalDecPrincipal > 0) {
        res[yrStr] = totalDecPrincipal;
      }
    });

    return res;
  }, [balanceSheet.years, passiveAccounts]);

  // Asset and Liability items (Share Investment flows from Stock Portfolio, ASNB flows from ASM 1+2+3 Dec principal)
  const assetItems = useMemo(() => {
    return balanceSheet.items
      .filter(i => i.type === 'asset')
      .map(item => {
        const lowerName = item.name.toLowerCase();
        const isShareItem =
          item.id === 'bs_share' ||
          lowerName.includes('share investment') ||
          lowerName === 'share' ||
          lowerName.includes('stock portfolio');

        const isAsnbItem =
          item.id === 'bs_asnb' ||
          lowerName.includes('asnb') ||
          (lowerName.includes('asm') && !lowerName.includes('2') && !lowerName.includes('3'));

        if (isShareItem) {
          const updatedValues = { ...item.values };
          balanceSheet.years.forEach(yr => {
            const yrKey = yr.toString();
            const flowVal = stockPortfolioValuesByYear[yrKey]?.total;
            if (flowVal !== undefined && flowVal > 0) {
              updatedValues[yrKey] = flowVal;
            }
          });
          return {
            ...item,
            values: updatedValues,
            isPortfolioLinked: true,
          };
        }

        if (isAsnbItem) {
          const updatedValues = { ...item.values };
          balanceSheet.years.forEach(yr => {
            const yrKey = yr.toString();
            const flowVal = asnbValuesByYear[yrKey];
            if (flowVal !== undefined && flowVal > 0) {
              updatedValues[yrKey] = flowVal;
            }
          });
          return {
            ...item,
            values: updatedValues,
            isAsnbLinked: true,
          };
        }

        return item;
      });
  }, [balanceSheet.items, balanceSheet.years, stockPortfolioValuesByYear, asnbValuesByYear]);
  const liabilityItems = useMemo(
    () => balanceSheet.items.filter(i => i.type === 'liability'),
    [balanceSheet.items]
  );

  // Totals calculations per year
  const totalsByYear = useMemo(() => {
    const res: Record<string, { totalAssets: number; totalLiabilities: number; netWorth: number; debtRatio: number }> = {};
    balanceSheet.years.forEach(yr => {
      const yrKey = yr.toString();
      const assets = assetItems.reduce((sum, item) => sum + (Number(item.values[yrKey]) || 0), 0);
      const liabilities = liabilityItems.reduce((sum, item) => sum + (Number(item.values[yrKey]) || 0), 0);
      const netWorth = assets - liabilities;
      const debtRatio = assets > 0 ? liabilities / assets : 0;
      res[yrKey] = { totalAssets: assets, totalLiabilities: liabilities, netWorth, debtRatio };
    });
    return res;
  }, [balanceSheet.years, assetItems, liabilityItems]);

  // Debt Ratio Table Data (Sorted chronologically for table & charts)
  const debtRatioRows = useMemo(() => {
    return [...balanceSheet.years]
      .sort((a, b) => a - b)
      .map(yr => {
        const yrKey = yr.toString();
        const data = totalsByYear[yrKey] || { totalAssets: 0, totalLiabilities: 0, debtRatio: 0 };
        return {
          year: yr,
          totalAsset: data.totalAssets,
          totalLiabilities: data.totalLiabilities,
          debtRatio: data.debtRatio
        };
      });
  }, [balanceSheet.years, totalsByYear]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Check stock account type (identical to CashflowPlanner)
  const checkStockAccountType = (item: (typeof passiveAccounts)[0]) => {
    const lower = (item.name || '').toLowerCase().trim();
    const cat = (item.category || '').toLowerCase().trim();
    const id = (item.id || '').toLowerCase();

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

      if (yr >= 2026) {
        const val = agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
        if (val > 0) {
          total += val;
          return;
        }
      }

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

      total += agg.totalUnits * (agg.currentPrice || agg.avgBuyPrice);
    });

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

  const getStockDividendsForMonth = (market: 'MY' | 'US', yr: number, month: string) => {
    const yrDividends = (dividends || []).filter(d => d.year === yr);
    return yrDividends.reduce((sum, d) => {
      const stockNameLower = (d.stockName || '').trim().toLowerCase();
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
      const currentPrincipal = flowPrincipal;
      const autoDividend = isMy
        ? getStockDividendsForMonth('MY', year, month)
        : getStockDividendsForMonth('US', year, month);

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

  // Helper to calculate total Dec principal for a given year from Passive Income Ledger (strictly following user account selection)
  const getPassiveDecPrincipalForYear = (yr: number) => {
    const targetAccounts = passiveAccounts.filter(a =>
      includedPrincipalAccountIds && includedPrincipalAccountIds.length > 0
        ? includedPrincipalAccountIds.includes(a.id)
        : true
    );
    const total = targetAccounts.reduce((sum, a) => sum + getPassiveMonthData(a, yr, 'Dec').principal, 0);
    return { total, hasAnyData: total > 0 };
  };

  // Helper to calculate total annual passive returns for a given year from Passive Income Ledger
  const getPassiveTotalIncomeForYear = (yr: number) => {
    const total = passiveAccounts.reduce((sum, a) => {
      const rSum = months.reduce((acc, m) => acc + getPassiveMonthData(a, yr, m).returns, 0);
      return sum + rSum;
    }, 0);
    return { total, hasAnyData: total > 0 };
  };

  // Annual Yield Table Data (Sorted chronologically, auto-flowing from Passive Income Ledger Dec Principal & Total Passive Income)
  const sortedAnnualReports = useMemo(() => {
    const rawSorted = [...annualReports].sort((a, b) => a.year - b.year);
    return rawSorted.map((row, idx, arr) => {
      const { total: decPrincipal, hasAnyData: hasPrincipalData } = getPassiveDecPrincipalForYear(row.year);
      const effectivePrincipal = hasPrincipalData && decPrincipal > 0 ? decPrincipal : row.principal;

      const { total: totalPassive, hasAnyData: hasPassiveData } = getPassiveTotalIncomeForYear(row.year);
      const effectivePassive = hasPassiveData && totalPassive > 0 ? totalPassive : row.passiveIncome;

      const prevRow = idx > 0 ? arr[idx - 1] : null;
      let prevEffectivePrincipal = prevRow?.principal || 0;
      if (prevRow) {
        const prevDec = getPassiveDecPrincipalForYear(prevRow.year);
        if (prevDec.hasAnyData && prevDec.total > 0) {
          prevEffectivePrincipal = prevDec.total;
        }
      }

      const growthP = prevEffectivePrincipal > 0
        ? ((effectivePrincipal - prevEffectivePrincipal) / prevEffectivePrincipal) * 100
        : (row.growthPPercent || 0);

      let prevEffectivePassive = prevRow ? prevRow.passiveIncome : 0;
      if (prevRow) {
        const prevPassive = getPassiveTotalIncomeForYear(prevRow.year);
        if (prevPassive.hasAnyData && prevPassive.total > 0) {
          prevEffectivePassive = prevPassive.total;
        }
      }

      const growthPI = prevEffectivePassive > 0
        ? ((effectivePassive - prevEffectivePassive) / prevEffectivePassive) * 100
        : (row.growthPIPercent || 0);

      return {
        ...row,
        principal: effectivePrincipal,
        passiveIncome: effectivePassive,
        growthPPercent: growthP,
        growthPIPercent: growthPI,
      };
    });
  }, [annualReports, passiveAccounts, holdings, stockValuations, dividends, includedPrincipalAccountIds]);

  // Investment Yearly Reports (Sorted chronologically)
  const sortedInvestmentReports = useMemo(() => {
    return [...investmentReports].sort((a, b) => a.year - b.year);
  }, [investmentReports]);

  // Chart 1: Quick Assets Distribution Data
  const assetsDistributionData = useMemo(() => {
    return [...balanceSheet.years]
      .sort((a, b) => a - b)
      .map(yr => {
        const yrKey = yr.toString();
        const entry: Record<string, any> = { year: yr.toString() };
        assetItems.forEach(item => {
          entry[item.name] = Number(item.values[yrKey]) || 0;
        });
        return entry;
      });
  }, [balanceSheet.years, assetItems]);

  // Colors for Asset Distribution lines (Google AI Studio clean palette)
  const assetColors = ['#2563EB', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#06B6D4', '#64748B'];

  // Handle cell save
  const handleSaveCell = (itemId: string, year: string) => {
    const val = parseFloat(cellInputVal.replace(/[^0-9.-]+/g, '')) || 0;
    updateBalanceSheetCell(itemId, year, val);
    setEditingCell(null);
  };

  // Handle add category
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addBalanceSheetCategory(newCatName.trim(), newCatType);
    setNewCatName('');
    setIsAddCategoryOpen(false);
  };

  // Handle Sync from Tabs
  const handleSyncFromTabs = async () => {
    setSyncStatus('Syncing data from stocks, dividends & passive accounts...');
    await syncBalanceSheetFromTabs(selectedYear !== 'ALL' ? selectedYear : undefined);
    setSyncStatus('✓ Data synced successfully from all tabs!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Year Selector & Actions (Visible on md+ desktop, hidden on mobile for clean charts-first layout) */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <YearSelector
            years={[...balanceSheet.years].sort((a, b) => a - b)}
            selectedYear={selectedYear}
            onSelectYear={setSelectedYear}
            showAllOption={true}
            allLabel="All Years"
            label="Year"
            onAddYear={(yr, cloneFrom) => {
              if (cloneFrom) {
                cloneBalanceSheetYear(cloneFrom, yr);
              } else {
                addBalanceSheetYear(yr);
              }
            }}
            onDeleteYear={(yr) => {
              if (balanceSheet.years.length > 1) {
                deleteBalanceSheetYear(yr);
              }
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Summary Tables
            </button>
            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Visual Charts
            </button>
          </div>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2 rounded-xl flex items-center justify-between animate-fadeIn">
          <span>{syncStatus}</span>
          <button onClick={() => setSyncStatus(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add Item Modal */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Add Asset / Liability</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="e.g., Fixed Deposit, PRS, Property Loan"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Classification</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('asset')}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      newCatType === 'asset'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Asset
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType('liability')}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                      newCatType === 'liability'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    Liability
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddCategoryOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer shadow-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MAIN VIEW CONTENT */}
      {/* On desktop: conditionally shown if activeTab === 'tables'. On mobile: hidden so charts are the primary view. */}
      {activeTab === 'tables' && (
        <div className="hidden md:block space-y-6">
          {/* 1. BALANCE SHEET Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-sm font-extrabold text-gray-900 tracking-tight uppercase">
                  BALANCE SHEET
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Asset / Liability</span>
              </button>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[75vh] no-scrollbar touch-scroll relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-gray-50 shadow-xs">
                  <tr className="border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 w-72 min-w-[200px] sticky left-0 top-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-1.5">
                        <span>Asset (Exclude PPE)</span>
                      </div>
                    </th>
                    {displayedYears.map(yr => (
                      <th key={yr} className="py-3 px-4 text-right min-w-[105px]">
                        {yr}
                      </th>
                    ))}
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-900 font-medium bg-white">
                  {/* Asset Rows */}
                  {assetItems.map(item => {
                    const isLinked = (item as any).isPortfolioLinked || (item as any).isAsnbLinked;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="py-2.5 px-4 font-semibold text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span>{item.name}</span>
                          </div>
                        </td>
                        {displayedYears.map(yr => {
                          const yrKey = yr.toString();
                          const val = item.values[yrKey] || 0;
                          const isEditing = editingCell?.itemId === item.id && editingCell?.year === yrKey;

                          return (
                            <td
                              key={yr}
                              className="py-2 px-4 text-right cursor-pointer min-w-[105px]"
                              onClick={() => {
                                if (!isEditing) {
                                  setEditingCell({ itemId: item.id, year: yrKey });
                                  setCellInputVal(val ? val.toString() : '0');
                                }
                              }}
                            >
                              {isEditing ? (
                                <input
                                  autoFocus
                                  type="text"
                                  value={cellInputVal}
                                  onChange={e => setCellInputVal(e.target.value)}
                                  onBlur={() => handleSaveCell(item.id, yrKey)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveCell(item.id, yrKey);
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className={`w-28 px-2 py-1 text-right text-xs bg-white border-2 ${isLinked ? 'border-indigo-600' : 'border-blue-600'} rounded-lg focus:outline-none shadow-xs font-mono font-bold text-gray-900`}
                                />
                              ) : (
                                <div className="flex items-center justify-end">
                                  <span className={`font-mono font-bold ${isLinked ? 'text-indigo-600' : 'text-gray-900 hover:text-blue-600 hover:underline'}`}>
                                    {val > 0 ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      <td className="py-2 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteBalanceSheetCategory(item.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}

                  {/* Total Assets Row */}
                  <tr className="bg-slate-100 font-bold text-gray-900 border-t-2 border-b-2 border-slate-200">
                    <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-gray-900 sticky left-0 z-10 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[200px]">
                      Total Assets
                    </td>
                    {displayedYears.map(yr => {
                      const yrKey = yr.toString();
                      const tot = totalsByYear[yrKey]?.totalAssets || 0;
                      return (
                        <td key={yr} className="py-3 px-4 text-right font-mono text-xs font-extrabold text-gray-900 min-w-[105px]">
                          {tot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>

                  {/* Liabilities Subheader */}
                  <tr className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <td colSpan={displayedYears.length + 2} className="py-2 px-4 sticky left-0 z-10 bg-gray-50 border-r border-gray-200">
                      Liabilities
                    </td>
                  </tr>

                  {/* Liability Rows */}
                  {liabilityItems.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-2.5 px-4 font-semibold text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[200px]">
                        {item.name}
                      </td>
                      {displayedYears.map(yr => {
                        const yrKey = yr.toString();
                        const val = item.values[yrKey] || 0;
                        const isEditing = editingCell?.itemId === item.id && editingCell?.year === yrKey;

                        return (
                          <td
                            key={yr}
                            className="py-2 px-4 text-right cursor-pointer min-w-[105px]"
                            onClick={() => {
                              if (!isEditing) {
                                setEditingCell({ itemId: item.id, year: yrKey });
                                setCellInputVal(val ? val.toString() : '0');
                              }
                            }}
                          >
                            {isEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={cellInputVal}
                                onChange={e => setCellInputVal(e.target.value)}
                                onBlur={() => handleSaveCell(item.id, yrKey)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveCell(item.id, yrKey);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-28 px-2 py-1 text-right text-xs bg-white border-2 border-blue-600 rounded-lg focus:outline-none shadow-xs font-mono font-bold text-gray-900"
                              />
                            ) : (
                              <span className="font-mono text-gray-900 hover:text-blue-600 hover:underline">
                                {val > 0 ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteBalanceSheetCategory(item.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Total Liabilities Row */}
                  <tr className="bg-slate-100 font-bold text-gray-900 border-t-2 border-b-2 border-slate-200">
                    <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-gray-900 sticky left-0 z-10 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[200px]">
                      Total Liabilities
                    </td>
                    {displayedYears.map(yr => {
                      const yrKey = yr.toString();
                      const tot = totalsByYear[yrKey]?.totalLiabilities || 0;
                      return (
                        <td key={yr} className="py-3 px-4 text-right font-mono text-xs font-extrabold text-gray-900 min-w-[105px]">
                          {tot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>

                  {/* Net Worth Row */}
                  <tr className="bg-blue-50/70 font-extrabold text-gray-900 border-t-2 border-b-2 border-blue-200">
                    <td className="py-3.5 px-4 uppercase text-xs tracking-wider text-gray-900 sticky left-0 z-10 bg-blue-50/70 border-r border-blue-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[200px]">
                      Net Worth
                    </td>
                    {displayedYears.map(yr => {
                      const yrKey = yr.toString();
                      const nw = totalsByYear[yrKey]?.netWorth || 0;
                      return (
                        <td key={yr} className="py-3.5 px-4 text-right font-mono text-xs font-black min-w-[105px]">
                          {nw < 0 ? (
                            <span className="text-rose-600">
                              ({Math.abs(nw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          ) : (
                            <span className="text-emerald-700">
                              {nw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid of Remaining 3 Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2. DEBT RATIO Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                  DEBT RATIO
                </h3>
              </div>
              <div className="overflow-x-auto no-scrollbar touch-scroll grow bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">YEAR</th>
                      <th className="py-2.5 px-4 text-right">Total Asset</th>
                      <th className="py-2.5 px-4 text-right">Total Liabilities</th>
                      <th className="py-2.5 px-4 text-right">Debt Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                    {debtRatioRows.map(row => (
                      <tr key={row.year} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-bold text-gray-900">{row.year}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{formatUSD(row.totalAsset)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{formatUSD(row.totalLiabilities)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                          {row.debtRatio.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. INVESTMENT PERFORMANCE Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                  INVESTMENT PERFORMANCE
                </h3>
              </div>
              <div className="overflow-x-auto no-scrollbar touch-scroll grow bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-4">YEAR</th>
                      <th className="py-2.5 px-4 text-right">Investment</th>
                      <th className="py-2.5 px-4 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                    {sortedInvestmentReports.map(row => (
                      <tr key={row.year} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-bold text-gray-900">{row.year}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{formatRM(row.investmentAmount)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          row.plPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatPercent(row.plPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3. RETURN ON INVESTMENT & PORTFOLIO GROWTH Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/80">
              <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                RETURN ON INVESTMENT & PORTFOLIO GROWTH
              </h3>
            </div>
            <div className="overflow-x-auto no-scrollbar touch-scroll bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">YEAR</th>
                    <th className="py-2.5 px-4 text-right">PRINCIPAL</th>
                    <th className="py-2.5 px-4 text-right">PASSIVE</th>
                    <th className="py-2.5 px-4 text-right">Annual Yield</th>
                    <th className="py-2.5 px-4 text-right">GROWTH (P)</th>
                    <th className="py-2.5 px-4 text-right">GROWTH (PI)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-900">
                  {sortedAnnualReports.map(row => {
                    const yieldPct = row.principal > 0 ? (row.passiveIncome / row.principal) * 100 : 0;
                    return (
                      <tr key={row.year} className="hover:bg-gray-50">
                        <td className="py-2.5 px-4 font-bold text-gray-900">{row.year}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{formatRM(row.principal)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-600">{formatRM(row.passiveIncome)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-700">
                          {yieldPct.toFixed(2)}%
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          row.growthPPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatPercent(row.growthPPercent)}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${
                          row.growthPIPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatPercent(row.growthPIPercent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts: ALWAYS visible on mobile (<md). On desktop (md+), visible when activeTab === 'charts' */}
      <div className={`${activeTab === 'charts' ? 'block' : 'block md:hidden'} space-y-6`}>
        {/* Chart 1: Balance Sheet Assets Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                Balance Sheet: Assets Distribution
              </h3>
              <div className="text-[10px] font-mono text-gray-500 font-bold">
                <span>(RM)</span>
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={assetsDistributionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={42}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                  />
                  <Tooltip
                    formatter={(val: any) => [`RM ${Number(val).toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  {assetItems.map((item, idx) => (
                    <Area
                      key={item.id}
                      type="monotone"
                      dataKey={item.name}
                      stackId="1"
                      stroke={assetColors[idx % assetColors.length]}
                      fill={assetColors[idx % assetColors.length]}
                      fillOpacity={0.65}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Debt Ratio & Annual Yield */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 2: Debt Ratio */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                  Debt Ratio
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 font-bold">
                  <span>Left: (RM)</span>
                  <span>Right: (Ratio)</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={debtRatioRows} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      width={42}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[0, 1.5]}
                      width={32}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        name === 'Debt Ratio' ? Number(val).toFixed(2) : `RM ${Number(val).toLocaleString()}`,
                        name
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar yAxisId="left" dataKey="totalAsset" name="Total Asset" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="left" dataKey="totalLiabilities" name="Total Liabilities" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="debtRatio" name="Debt Ratio" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Return on Investment */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                  Return on Investment
                </h3>
                <div className="text-[10px] font-mono text-gray-500 font-bold">
                  <span>(RM)</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={sortedAnnualReports.map(r => ({
                      year: r.year.toString(),
                      'Principal': r.principal,
                      'Passive Amount': r.passiveIncome
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={42}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        `RM ${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        name
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="Principal" name="Principal (RM)" fill="#334155" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Passive Amount" name="Passive Amount (RM)" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row 3: Portfolio Growth Metrics & Investment Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 4: Portfolio Growth Metrics (Line Chart for Passive Growth, Principal Growth, and Dividend Yield) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                  Portfolio Growth Metrics
                </h3>
                <div className="text-[10px] font-mono text-gray-500 font-bold">
                  <span>(%)</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={sortedAnnualReports.map(r => ({
                      year: r.year.toString(),
                      'GROWTH (P) %': r.growthPPercent,
                      'GROWTH (PI) %': r.growthPIPercent,
                      'Dividend Yield %': r.principal > 0 ? (r.passiveIncome / r.principal) * 100 : 0
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={38}
                      tickFormatter={v => `${v}`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        `${Number(val).toFixed(2)}%`,
                        name
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Line type="monotone" dataKey="GROWTH (P) %" name="Principal Growth %" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="GROWTH (PI) %" name="Passive Growth %" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Dividend Yield %" name="Dividend Yield %" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Investment Performance */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-gray-900 tracking-tight">
                  Investment Performance
                </h3>
                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 font-bold">
                  <span>Left: (RM)</span>
                  <span>Right: (%)</span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={sortedInvestmentReports.map(r => ({
                      year: r.year.toString(),
                      Investment: r.investmentAmount,
                      'P/L %': r.plPercent
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#E2E8F0' }} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis
                      yAxisId="left"
                      tickLine={false}
                      axisLine={false}
                      width={42}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={38}
                      tickFormatter={v => `${v}`}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        name.includes('%') ? `${Number(val).toFixed(2)}%` : `RM ${Number(val).toLocaleString()}`,
                        name
                      ]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#0F172A', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar yAxisId="left" dataKey="Investment" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="P/L %" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

      {/* Share Investment Details Breakdown Modal (Flows directly from Stock Portfolio) */}
      {shareBreakdownYear !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span>Share Investment Breakdown</span>
                    <span className="text-xs bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md border border-blue-200">
                      {shareBreakdownYear}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Flows directly from your Stocks tab</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareBreakdownYear(null)}
                className="text-gray-400 hover:text-gray-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Year Selector Tabs inside modal */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
                Year:
              </span>
              {displayedYears.map(yr => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setShareBreakdownYear(yr)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    shareBreakdownYear === yr
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {/* Content Table */}
            <div className="space-y-3">
              <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-[11px] text-gray-600 uppercase tracking-wider font-bold border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Stock / Asset</th>
                      <th className="py-2.5 px-2 text-center">Market</th>
                      <th className="py-2.5 px-3 text-right">Portfolio Value</th>
                      <th className="py-2.5 px-3 text-right">MYR Equivalent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {(stockPortfolioValuesByYear[shareBreakdownYear.toString()]?.stocks || []).length > 0 ? (
                      stockPortfolioValuesByYear[shareBreakdownYear.toString()].stocks.map((stk, idx) => {
                        const isUSD = stk.currency === 'USD' || stk.market === 'US';
                        const myrVal = isUSD ? stk.value * 4.45 : stk.value;

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2 px-3">
                              <div className="font-bold text-gray-900">{stk.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{stk.code}</div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  stk.market === 'MY'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : stk.market === 'US'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {stk.market}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-900 font-bold">
                              {stk.currency === 'USD' ? '$' : 'RM '}
                              {stk.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-blue-700 font-extrabold">
                              RM {myrVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-gray-400 text-xs">
                          No specific stock records logged for {shareBreakdownYear}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Total Summary Row */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                    Total Share Investment ({shareBreakdownYear})
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Reflected directly in Balance Sheet Total Assets & Net Worth
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-base font-mono font-extrabold text-gray-900">
                    RM {(stockPortfolioValuesByYear[shareBreakdownYear.toString()]?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShareBreakdownYear(null)}
                className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
