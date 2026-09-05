import React, { useState, useMemo } from 'react';
import { useWealth } from '../context/WealthContext';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { YearSelector } from './YearSelector';
import { FormattedNumberInput } from './FormattedNumberInput';

export const DividendTracker: React.FC = () => {
  const { dividends, updateDividendPayout, addDividendRecord, deleteDividendRecord, holdings, stockValuations, realizedTrades } = useWealth();

  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(2026);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStockKey, setSelectedStockKey] = useState('');

  const monthKeys = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // All years
  const allYears = Array.from(new Set<number>([2021, 2022, 2023, 2024, 2025, 2026, ...dividends.map(d => d.year)])).sort((a, b) => a - b);
  const currentYearNum = typeof selectedYear === 'number' ? selectedYear : 2026;

  // Filter dividends by selected year
  const yearDividends = dividends.filter(d => d.year === currentYearNum);

  // Compute monthly totals for the selected year
  const monthlyTotals = monthKeys.reduce((acc, month) => {
    acc[month] = yearDividends.reduce((sum, d) => sum + (d.monthlyPayouts[month] || 0), 0);
    return acc;
  }, {} as { [key: string]: number });

  const yearTotalDividend = (Object.values(monthlyTotals) as number[]).reduce((a, b) => a + b, 0);

  // Helper formatter for Malaysian Ringgit with comma separators
  const formatRM = (num: number) => `RM ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Helper to compute valuation (Initial & End) for any dividend record in a specific year
  const getRecordValuation = (row: { stockName: string; code?: string; totalMarketValue?: number }, yr: number) => {
    const valRecord = stockValuations.find(
      v => v.year === yr && ((row.code && v.code && v.code.trim().toUpperCase() === row.code.trim().toUpperCase()) || v.stockName.toLowerCase().trim() === row.stockName.toLowerCase().trim())
    );
    const prevValRecord = stockValuations.find(
      v => v.year === yr - 1 && ((row.code && v.code && v.code.trim().toUpperCase() === row.code.trim().toUpperCase()) || v.stockName.toLowerCase().trim() === row.stockName.toLowerCase().trim())
    );

    const matchedHoldings = holdings.filter(
      h => (row.code && h.code && h.code.trim().toUpperCase() === row.code.trim().toUpperCase()) || h.name.toLowerCase().trim() === row.stockName.toLowerCase().trim()
    );
    const matchedUnits = matchedHoldings.reduce((sum, h) => sum + h.units, 0);
    const holdingCost = matchedHoldings.reduce((sum, h) => sum + h.units * h.buyUnitPrice, 0);
    const holdingMarketVal = matchedHoldings.reduce((sum, h) => sum + h.units * (h.currentPrice ?? h.buyUnitPrice), 0);

    let cost = holdingCost;
    if (cost === 0) {
      const matchedTrades = realizedTrades.filter(
        t => (row.code && t.code && t.code.trim().toUpperCase() === row.code.trim().toUpperCase()) || t.name.toLowerCase().trim() === row.stockName.toLowerCase().trim()
      );
      if (matchedTrades.length > 0) {
        cost = matchedTrades.reduce((sum, t) => sum + t.units * t.buyUnitPrice, 0);
      }
    }
    if (cost === 0 && row.totalMarketValue) {
      cost = row.totalMarketValue;
    }

    const initUnitPrice = prevValRecord ? prevValRecord.endOfYearValue : (valRecord?.startOfYearValue || 0);
    const endUnitPrice = (valRecord?.endOfYearValue && valRecord.endOfYearValue > 0) ? valRecord.endOfYearValue : (valRecord?.startOfYearValue || initUnitPrice);

    const initialVal = initUnitPrice > 0 && matchedUnits > 0 ? initUnitPrice * matchedUnits : (holdingCost > 0 ? holdingCost : (row.totalMarketValue || 0));
    const endVal = endUnitPrice > 0 && matchedUnits > 0 ? endUnitPrice * matchedUnits : (holdingMarketVal > 0 ? holdingMarketVal : (row.totalMarketValue || initialVal));

    return { initialVal, endVal, matchedUnits, cost };
  };

  // Stock Portfolio Valuation for the selected year (sum across all tracked stocks for that year)
  const portfolioValInitial = useMemo(() => {
    if (yearDividends.length > 0) {
      return yearDividends.reduce((sum, d) => sum + getRecordValuation(d, currentYearNum).initialVal, 0);
    }
    const yrVals = stockValuations.filter(v => v.year === currentYearNum && v.market === 'MY');
    return yrVals.reduce((sum, v) => {
      const matched = holdings.filter(h => (v.code && h.code && h.code.toUpperCase() === v.code.toUpperCase()) || h.name.toLowerCase() === v.stockName.toLowerCase());
      const units = matched.reduce((s, h) => s + h.units, 0);
      return sum + (units > 0 ? units * v.startOfYearValue : v.startOfYearValue);
    }, 0);
  }, [yearDividends, currentYearNum, stockValuations, holdings]);

  const portfolioValEnd = useMemo(() => {
    if (yearDividends.length > 0) {
      return yearDividends.reduce((sum, d) => sum + getRecordValuation(d, currentYearNum).endVal, 0);
    }
    const yrVals = stockValuations.filter(v => v.year === currentYearNum && v.market === 'MY');
    return yrVals.reduce((sum, v) => {
      const matched = holdings.filter(h => (v.code && h.code && h.code.toUpperCase() === v.code.toUpperCase()) || h.name.toLowerCase() === v.stockName.toLowerCase());
      const units = matched.reduce((s, h) => s + h.units, 0);
      const price = v.endOfYearValue > 0 ? v.endOfYearValue : v.startOfYearValue;
      return sum + (units > 0 ? units * price : price);
    }, 0);
  }, [yearDividends, currentYearNum, stockValuations, holdings]);

  // Total Portfolio Cost Basis for the selected year
  const portfolioCostBasis = useMemo(() => {
    if (yearDividends.length > 0) {
      return yearDividends.reduce((sum, d) => sum + getRecordValuation(d, currentYearNum).cost, 0);
    }
    const yrVals = stockValuations.filter(v => v.year === currentYearNum && v.market === 'MY');
    return yrVals.reduce((sum, v) => {
      const matched = holdings.filter(h => (v.code && h.code && h.code.toUpperCase() === v.code.toUpperCase()) || h.name.toLowerCase() === v.stockName.toLowerCase());
      const cost = matched.reduce((s, h) => s + h.units * h.buyUnitPrice, 0);
      return sum + cost;
    }, 0);
  }, [yearDividends, currentYearNum, stockValuations, holdings, realizedTrades]);

  const effectivePortfolioVal = portfolioValEnd > 0 ? portfolioValEnd : portfolioValInitial;
  const overallYieldInit = portfolioValInitial > 0 ? (yearTotalDividend / portfolioValInitial) * 100 : 0;
  const overallYieldEnd = portfolioValEnd > 0 ? (yearTotalDividend / portfolioValEnd) * 100 : 0;
  const yearDividendYieldPercent = effectivePortfolioVal > 0 ? (yearTotalDividend / effectivePortfolioVal) * 100 : 0;
  const yearYieldOnCostPercent = portfolioCostBasis > 0 ? (yearTotalDividend / portfolioCostBasis) * 100 : 0;

  // Historical Chart data across all years using Stock Portfolio valuations
  const historicalChartData = allYears.map(yr => {
    const yrRecords = dividends.filter(d => d.year === yr);
    const yrDividendSum = yrRecords.reduce(
      (sum, d) => sum + (Object.values(d.monthlyPayouts) as number[]).reduce((a, b) => a + b, 0),
      0
    );
    const yrStockVal = yrRecords.reduce((sum, d) => {
      const val = getRecordValuation(d, yr);
      return sum + (val.endVal > 0 ? val.endVal : val.initialVal);
    }, 0);
    const dy = yrStockVal > 0 ? (yrDividendSum / yrStockVal) * 100 : 0;

    return {
      year: yr.toString(),
      DIVIDEND: yrDividendSum,
      'D/Y %': Number(dy.toFixed(2)),
    };
  });

  // Available stocks from portfolio for the specific selected year
  const availablePortfolioStocks = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();

    // 1. Check stock valuations recorded for this specific year
    stockValuations
      .filter(v => v.year === currentYearNum)
      .forEach(v => {
        const key = (v.code || v.stockName).trim().toUpperCase();
        if (!map.has(key)) map.set(key, { code: v.code || '', name: v.stockName });
      });

    // 2. Check active holdings bought in or before this year
    holdings.forEach(h => {
      const buyYear = h.buyDate ? parseInt(h.buyDate.slice(0, 4), 10) : 2026;
      if (buyYear <= currentYearNum) {
        const key = (h.code || h.name).trim().toUpperCase();
        if (!map.has(key)) map.set(key, { code: h.code, name: h.name });
      }
    });

    // 3. Check realized trades that were held during this year
    realizedTrades.forEach(t => {
      const buyYear = t.buyDate ? parseInt(t.buyDate.slice(0, 4), 10) : currentYearNum;
      const sellYear = t.sellDate ? parseInt(t.sellDate.slice(0, 4), 10) : currentYearNum;
      if (buyYear <= currentYearNum && sellYear >= currentYearNum) {
        const key = (t.code || t.name).trim().toUpperCase();
        if (!map.has(key)) map.set(key, { code: t.code, name: t.name });
      }
    });

    return Array.from(map.values());
  }, [currentYearNum, stockValuations, holdings, realizedTrades]);

  const handleOpenAddModal = () => {
    const unadded = availablePortfolioStocks.find(
      s => !yearDividends.some(d => (s.code && d.code === s.code) || d.stockName.toLowerCase() === s.name.toLowerCase())
    );
    setSelectedStockKey(unadded ? (unadded.code || unadded.name) : (availablePortfolioStocks[0]?.code || availablePortfolioStocks[0]?.name || ''));
    setShowAddModal(true);
  };

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockKey) return;

    const selectedStock = availablePortfolioStocks.find(
      s => (s.code && s.code.toUpperCase() === selectedStockKey.toUpperCase()) || s.name.toUpperCase() === selectedStockKey.toUpperCase()
    );
    if (!selectedStock) return;

    // Check if already in yearDividends
    const alreadyExists = yearDividends.some(
      d => (selectedStock.code && d.code === selectedStock.code) || d.stockName.toLowerCase() === selectedStock.name.toLowerCase()
    );
    if (alreadyExists) {
      setShowAddModal(false);
      return;
    }

    // Find valuation from stock portfolio
    const matchedVal = stockValuations.find(
      v => v.year === currentYearNum && ((selectedStock.code && v.code === selectedStock.code) || v.stockName.toLowerCase() === selectedStock.name.toLowerCase())
    );
    const matchedHolding = holdings.filter(
      h => (selectedStock.code && h.code.toUpperCase() === selectedStock.code.toUpperCase()) || h.name.toLowerCase() === selectedStock.name.toLowerCase()
    );
    const holdingCost = matchedHolding.reduce((s, h) => s + h.units * h.buyUnitPrice, 0);
    const derivedMktVal = matchedVal?.endOfYearValue || matchedVal?.startOfYearValue || holdingCost || 0;

    addDividendRecord({
      year: currentYearNum,
      stockName: selectedStock.name,
      code: selectedStock.code || undefined,
      monthlyPayouts: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
      totalMarketValue: derivedMktVal,
    });

    setShowAddModal(false);
  };

  return (
    <div id="dividend-tracker-section" className="space-y-6">
      {/* Year Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <YearSelector
            years={allYears}
            selectedYear={currentYearNum}
            onSelectYear={(yr) => typeof yr === 'number' && setSelectedYear(yr)}
            showAllOption={false}
            label="Year"
            onAddYear={(yr) => {
              setSelectedYear(yr);
            }}
            onDeleteYear={(yr) => {
              const toDelete = dividends.filter(d => d.year === yr);
              toDelete.forEach(d => deleteDividendRecord(d.id));
              setSelectedYear(2026);
            }}
          />
        </div>
      </div>

      {/* Year Metric Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Total Dividend Payout ({currentYearNum})
            </span>
          </div>
          <div className="text-xl font-extrabold text-indigo-600 font-mono">
            {formatRM(yearTotalDividend)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Stock Portfolio Valuation ({currentYearNum})
            </span>
          </div>
          <div className="text-xl font-extrabold text-indigo-600 font-mono">
            {formatRM(effectivePortfolioVal)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2 font-mono">
            <span>Initial: <span className="text-indigo-600 font-semibold">{formatRM(portfolioValInitial)}</span></span>
            <span>•</span>
            <span>End: <span className="text-indigo-600 font-semibold">{formatRM(portfolioValEnd)}</span></span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Dividend Yield ({currentYearNum})
            </span>
          </div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono">
            {yearDividendYieldPercent.toFixed(2)}%
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block font-mono">
            Init: {overallYieldInit.toFixed(2)}% | End: {overallYieldEnd.toFixed(2)}%
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Yield on Cost ({currentYearNum})
            </span>
          </div>
          <div className="text-xl font-extrabold text-blue-600 font-mono">
            {yearYieldOnCostPercent.toFixed(2)}%
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 block font-mono">
            Cost Basis: <span className="text-blue-600 font-semibold">{formatRM(portfolioCostBasis)}</span>
          </span>
        </div>
      </div>

      {/* Historical Graph */}
      <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">
            Dividend Yield
          </h3>
          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 font-bold">
            <span>Left: (RM)</span>
            <span>Right: (%)</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={historicalChartData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} tick={{ fill: '#64748B' }} />
              <YAxis
                yAxisId="left"
                stroke="#64748B"
                fontSize={11}
                tick={{ fill: '#64748B' }}
                tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Number(v).toLocaleString())}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10B981"
                fontSize={11}
                tick={{ fill: '#10B981' }}
                tickFormatter={v => `${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '12px',
                  color: '#0F172A',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: any) => [
                  name.includes('%') || name.includes('Yield') ? `${Number(value).toFixed(2)}%` : formatRM(Number(value)),
                  name
                ]}
              />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }} />
              <Bar yAxisId="left" dataKey="DIVIDEND" fill="#2563EB" radius={[4, 4, 0, 0]} name="Dividend Payout (RM)" />
              <Line yAxisId="right" type="monotone" dataKey="D/Y %" stroke="#10B981" strokeWidth={2.5} name="Dividend Yield (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Dividend Payout Matrix Table */}
      <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <h3 className="font-bold text-gray-900 text-sm tracking-tight">
            Monthly Dividend Breakdown ({currentYearNum})
          </h3>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dividend Payout</span>
          </button>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[65vh] no-scrollbar touch-scroll relative">
          <table className="w-full text-left text-xs text-gray-900 border-collapse">
            <thead className="sticky top-0 z-20 bg-gray-50/90 shadow-[0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-xs">
              <tr className="text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200 tracking-wider">
                <th className="py-3 px-3 min-w-[140px] sticky left-0 top-0 z-30 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Stock</th>
                {monthKeys.map(m => (
                  <th key={m} className="py-3 px-2 text-center min-w-[65px]">{m}</th>
                ))}
                <th className="py-3 px-3 text-right font-bold text-gray-900 min-w-[90px] bg-gray-50">
                  Annual Total
                </th>
                <th className="py-3 px-3 text-right min-w-[75px] bg-gray-50">
                  Yield
                </th>
                <th className="py-3 px-3 text-right min-w-[75px] bg-gray-50">
                  YOC
                </th>
                <th className="py-3 px-2 text-center w-10 bg-gray-50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {yearDividends.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-gray-400">
                    No dividend records for {currentYearNum}. Click "Add Dividend Payout" to add a stock.
                  </td>
                </tr>
              ) : (
                yearDividends.map(row => {
                  const stockSum = (Object.values(row.monthlyPayouts) as number[]).reduce((a, b) => a + b, 0);
                  const { endVal, cost } = getRecordValuation(row, currentYearNum);

                  const yieldEnd = endVal > 0 ? (stockSum / endVal) * 100 : 0;
                  const yoc = cost > 0 ? (stockSum / cost) * 100 : 0;

                  return (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="py-2.5 px-3 font-bold text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <div>{row.stockName}</div>
                        {row.code && <div className="text-[10px] font-mono text-gray-400">{row.code}</div>}
                      </td>
                      {monthKeys.map(m => {
                        const val = row.monthlyPayouts[m] || 0;
                        return (
                          <td key={m} className="py-1.5 px-1 text-center font-mono">
                            <FormattedNumberInput
                              value={val === 0 ? '' : val}
                              placeholder="-"
                              showZeroAsBlank={true}
                              onChange={v => updateDividendPayout(row.id, m, v)}
                              className={`w-full text-center bg-transparent py-1 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors font-mono ${
                                val > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600" title="Auto-flowing annual total">
                        {formatRM(stockSum)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-gray-600" title={`End Portfolio Valuation: ${formatRM(endVal)}`}>
                        {yieldEnd > 0 ? `${yieldEnd.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-blue-600 font-semibold" title={`Purchase Cost Basis: ${formatRM(cost)}`}>
                        {yoc > 0 ? `${yoc.toFixed(2)}%` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => deleteDividendRecord(row.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete stock payout record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Monthly Totals Footer Row */}
              {yearDividends.length > 0 && (
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                  <td className="py-3 px-3 text-gray-900 uppercase text-[10px] tracking-wider sticky left-0 z-10 bg-gray-50 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Total ({currentYearNum})</td>
                  {monthKeys.map(m => (
                    <td key={m} className="py-3 px-2 text-center font-mono text-gray-900 font-bold">
                      {monthlyTotals[m] > 0 ? monthlyTotals[m].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 font-extrabold">
                    {formatRM(yearTotalDividend)}
                  </td>
                  <td className="py-3 px-3 text-right text-[11px] font-mono text-gray-700 font-semibold">
                    {overallYieldEnd > 0 ? `${overallYieldEnd.toFixed(2)}%` : '-'}
                  </td>
                  <td className="py-3 px-3 text-right text-[11px] font-mono text-blue-600 font-bold">
                    {yearYieldOnCostPercent > 0 ? `${yearYieldOnCostPercent.toFixed(2)}%` : '-'}
                  </td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Stock Dividend Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-gray-200 max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Add Stock for Dividend Tracking ({currentYearNum})</h3>
            <form onSubmit={handleCreateRecord} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1.5">
                  Select from Stock Portfolio
                </label>
                {availablePortfolioStocks.length > 0 ? (
                  <select
                    value={selectedStockKey}
                    onChange={e => setSelectedStockKey(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-xs"
                  >
                    <option value="" disabled>-- Choose a stock from portfolio --</option>
                    {availablePortfolioStocks.map(s => {
                      const isAdded = yearDividends.some(
                        d => (s.code && d.code === s.code) || d.stockName.toLowerCase() === s.name.toLowerCase()
                      );
                      const keyVal = s.code || s.name;
                      return (
                        <option key={keyVal} value={keyVal} disabled={isAdded}>
                          {s.name} {s.code ? `(${s.code})` : ''} {isAdded ? '— [Already in Tracker]' : ''}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    No stocks found in your Stock Portfolio for {currentYearNum}. Please record this stock in the Stock Portfolio ledger for {currentYearNum} first.
                  </div>
                )}
              </div>

              <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100 flex items-center gap-2 text-[11px] text-blue-800">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Valuation & dividend yield will automatically sync from your Stock Portfolio ledger.</span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedStockKey || availablePortfolioStocks.length === 0}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
