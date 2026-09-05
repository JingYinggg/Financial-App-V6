import React, { useState, useMemo } from 'react';
import { useWealth } from '../context/WealthContext';
import { CreditCard, CreditCardCategory } from '../types';
import {
  CreditCard as CardIcon,
  Plus,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Info,
  Calendar,
  Tag,
  ShieldCheck,
  ShieldAlert,
  X,
  Edit2,
  Save,
  Check,
  Fuel,
  ShoppingCart,
  Smartphone,
  Utensils,
  Globe,
  Calculator,
  Settings2,
  Trash2,
  Ban,
  ListPlus,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { YearSelector } from './YearSelector';
import { FormattedNumberInput } from './FormattedNumberInput';

export const CreditCardCashback: React.FC = () => {
  const {
    creditCards,
    monthlyCardSpends,
    saveCardSpend,
    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addCreditCardCategory,
    deleteCreditCardCategory,
    updateCreditCardCategory,
    overrideCardRulesForMonth,
  } = useWealth();

  const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || 'hsbc_5458');
  const [selectedMonth, setSelectedMonth] = useState<string>('Feb');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [extraYears, setExtraYears] = useState<number[]>([]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // All years
  const allYears = useMemo(() => {
    const yearsSet = new Set<number>([2023, 2024, 2025, 2026, ...extraYears, ...monthlyCardSpends.map(s => s.year)]);
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [monthlyCardSpends, extraYears]);

  // Modals & Details State
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [showMinSpendModal, setShowMinSpendModal] = useState(false);
  const [minSpendInput, setMinSpendInput] = useState<number | string>(0);
  const [minSpendNotes, setMinSpendNotes] = useState<string>('');
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [editCardForm, setEditCardForm] = useState({
    cardName: '',
    bank: '',
    accountNo: '',
    minMonthlySpend: 0,
    notes: '',
  });

  // Add Category Modal State
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState<{
    name: string;
    ratePercent: number | string;
    capRM: number | string;
    conditions: string;
    eligibleItems: string[];
    excludedItems: string[];
    ruleScope: 'forward' | 'all';
  }>({
    name: '',
    ratePercent: 5.0,
    capRM: '',
    conditions: '',
    eligibleItems: [],
    excludedItems: [],
    ruleScope: 'forward',
  });
  const [newCatEligibleInput, setNewCatEligibleInput] = useState('');
  const [newCatExcludedInput, setNewCatExcludedInput] = useState('');

  // Category Details & Edit Modal State
  const [showEligibleModal, setShowEligibleModal] = useState(false);
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    card: CreditCard;
    category: CreditCardCategory;
  } | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editedCategory, setEditedCategory] = useState<CreditCardCategory | null>(null);
  const [ruleScope, setRuleScope] = useState<'forward' | 'all'>('forward');
  const [newEligibleItemInput, setNewEligibleItemInput] = useState('');
  const [newExcludedItemInput, setNewExcludedItemInput] = useState('');

  // New Card Form
  const [newCardForm, setNewCardForm] = useState({
    cardName: '',
    bank: '',
    accountNo: '',
    minMonthlySpend: 1000,
    notes: '',
  });

  // Local formula inputs state for smooth typing
  const [inputFormulas, setInputFormulas] = useState<{ [catId: string]: string }>({});
  const [focusedCatId, setFocusedCatId] = useState<string | null>(null);

  const currentCard = creditCards.find(c => c.id === selectedCardId) || creditCards[0];

  // Resolve effective categories for current card, year, and month based on forward flowing rule overrides
  const effectiveCategories = useMemo(() => {
    if (!currentCard) return [];
    const monthIndex = months.indexOf(selectedMonth);
    
    // Find the latest override up to the current month in this year
    let activeCategories: CreditCardCategory[] | null = null;
    if (currentCard.monthRuleOverrides) {
      for (let i = monthIndex; i >= 0; i--) {
        const key = `${selectedYear}-${months[i]}`;
        if (currentCard.monthRuleOverrides[key]) {
          activeCategories = currentCard.monthRuleOverrides[key];
          break;
        }
      }
    }
    
    return activeCategories || currentCard.categories;
  }, [currentCard, selectedYear, selectedMonth, months]);

  // Retrieve existing spends for selected card, month, year
  const currentSpendRecord = useMemo(() => {
    return monthlyCardSpends.find(
      s => s.cardId === selectedCardId && s.year === selectedYear && s.month === selectedMonth
    );
  }, [monthlyCardSpends, selectedCardId, selectedYear, selectedMonth]);

  const categorySpends = currentSpendRecord?.categorySpends || {};
  const spendFormulas = currentSpendRecord?.spendFormulas || {};
  const actualCashbackMap = currentSpendRecord?.actualCashback || {};

  // Safe evaluation of spend expressions like "100+50" or "=200*1.06"
  const evaluateExpression = (expr: string): number => {
    try {
      const sanitized = expr.replace(/^=/, '').trim();
      if (!sanitized) return 0;
      // Allow only digits, decimal points, and basic math operators
      if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized})`)();
        return typeof result === 'number' && !isNaN(result) ? result : 0;
      }
      const num = parseFloat(sanitized);
      return isNaN(num) ? 0 : num;
    } catch {
      return 0;
    }
  };

  // Compute Cashback earned per category
  const calculateCashbackForCat = (cat: CreditCardCategory, spend: number) => {
    const rawCashback = Math.round(((spend * cat.ratePercent) / 100) * 100) / 100;
    if (cat.capRM && rawCashback > cat.capRM) {
      return {
        earned: Number(cat.capRM.toFixed(2)),
        capped: true,
        raw: rawCashback,
        optimalSpend: Math.round((cat.capRM / (cat.ratePercent / 100)) * 100) / 100,
        excessSpend: Math.round((spend - (cat.capRM / (cat.ratePercent / 100))) * 100) / 100,
      };
    }
    return {
      earned: rawCashback,
      capped: false,
      raw: rawCashback,
      optimalSpend: cat.capRM ? Math.round((cat.capRM / (cat.ratePercent / 100)) * 100) / 100 : undefined,
      excessSpend: 0,
    };
  };

  const handleSpendInputChange = (catId: string, valStr: string) => {
    setInputFormulas(prev => ({ ...prev, [catId]: valStr }));
  };

  const handleSpendInputFocus = (catId: string, currentSpend: number) => {
    setFocusedCatId(catId);
    const existingFormula = spendFormulas[catId];
    if (existingFormula) {
      setInputFormulas(prev => ({ ...prev, [catId]: existingFormula }));
    } else if (currentSpend > 0) {
      setInputFormulas(prev => ({ ...prev, [catId]: currentSpend % 1 === 0 ? String(currentSpend) : String(currentSpend) }));
    } else {
      setInputFormulas(prev => ({ ...prev, [catId]: '' }));
    }
  };

  const handleSpendInputBlur = (catId: string) => {
    setFocusedCatId(null);
    const rawStr = (inputFormulas[catId] ?? (spendFormulas[catId] || (categorySpends[catId] ? String(categorySpends[catId]) : ''))).trim();

    if (!rawStr) {
      const updatedSpends = { ...categorySpends, [catId]: 0 };
      const updatedFormulas = { ...spendFormulas };
      delete updatedFormulas[catId];
      setInputFormulas(prev => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });
      saveCardSpend(selectedCardId, selectedYear, selectedMonth, updatedSpends, updatedFormulas, actualCashbackMap, currentSpendRecord?.finalTotalCashback);
      return;
    }

    const evaluated = Math.round(evaluateExpression(rawStr) * 100) / 100;
    const updatedSpends = { ...categorySpends, [catId]: evaluated };
    // Keep formula expression if user typed a mathematical string (e.g. 12+12+12)
    const updatedFormulas = { ...spendFormulas, [catId]: rawStr };

    // Clear active temporary inputFormulas so that the blurred display immediately shows evaluated spend (e.g. 36)
    setInputFormulas(prev => {
      const next = { ...prev };
      delete next[catId];
      return next;
    });

    saveCardSpend(selectedCardId, selectedYear, selectedMonth, updatedSpends, updatedFormulas, actualCashbackMap, currentSpendRecord?.finalTotalCashback);
  };

  const handleActualCashbackChange = (catId: string, val: number) => {
    const rounded = Math.round(val * 100) / 100;
    const updatedActual = { ...actualCashbackMap, [catId]: rounded };
    saveCardSpend(selectedCardId, selectedYear, selectedMonth, categorySpends, spendFormulas, updatedActual, currentSpendRecord?.finalTotalCashback);
  };

  const handleFinalTotalCashbackChange = (val: number) => {
    const rounded = Math.round(val * 100) / 100;
    saveCardSpend(selectedCardId, selectedYear, selectedMonth, categorySpends, spendFormulas, actualCashbackMap, rounded);
  };

  const handleCategoryCapChange = (catId: string, newCap: number) => {
    if (!currentCard) return;
    const updated = effectiveCategories.map(c => c.id === catId ? { ...c, capRM: newCap > 0 ? Math.round(newCap * 100) / 100 : undefined } : c);
    overrideCardRulesForMonth(selectedCardId, selectedYear, selectedMonth, updated);
  };

  // Total monthly stats for active card
  let totalMonthlySpend = 0;
  let totalMonthlyCalculatedCashback = 0;
  let totalMonthlyFinalCashback = 0;

  if (currentCard) {
    effectiveCategories.forEach(cat => {
      const spend = categorySpends[cat.id] || 0;
      totalMonthlySpend += spend;
      const cb = calculateCashbackForCat(cat, spend);
      totalMonthlyCalculatedCashback += cb.earned;
      const actual = actualCashbackMap[cat.id] !== undefined ? actualCashbackMap[cat.id] : cb.earned;
      totalMonthlyFinalCashback += actual;
    });
    totalMonthlySpend = Math.round(totalMonthlySpend * 100) / 100;
    totalMonthlyCalculatedCashback = Math.round(totalMonthlyCalculatedCashback * 100) / 100;
    totalMonthlyFinalCashback = Math.round(totalMonthlyFinalCashback * 100) / 100;
  }

  // If final statement total override is set, use it
  const displayTotalCashback = currentSpendRecord?.finalTotalCashback !== undefined 
    ? currentSpendRecord.finalTotalCashback 
    : totalMonthlyFinalCashback;

  // Calculate annual total cashback for the SELECTED YEAR across ALL cards
  const annualStatsForYear = useMemo(() => {
    const yearSpends = monthlyCardSpends.filter(s => s.year === selectedYear);
    let totalSpend = 0;
    let totalCashback = 0;

    const monthlyBreakdown: { [month: string]: number } = {};
    months.forEach(m => (monthlyBreakdown[m] = 0));

    yearSpends.forEach(sp => {
      const card = creditCards.find(c => c.id === sp.cardId);
      if (!card) return;
      
      let cardMonthSpend = 0;
      let cardMonthCashback = 0;

      card.categories.forEach(cat => {
        const spend = sp.categorySpends[cat.id] || 0;
        cardMonthSpend += spend;
        const cb = calculateCashbackForCat(cat, spend);
        const actual = sp.actualCashback && sp.actualCashback[cat.id] !== undefined 
          ? sp.actualCashback[cat.id] 
          : cb.earned;
        cardMonthCashback += actual;
      });

      const effectiveMonthCashback = sp.finalTotalCashback !== undefined ? sp.finalTotalCashback : cardMonthCashback;
      totalSpend += cardMonthSpend;
      totalCashback += effectiveMonthCashback;
      monthlyBreakdown[sp.month] = (monthlyBreakdown[sp.month] || 0) + effectiveMonthCashback;
    });

    return { totalSpend, totalCashback, monthlyBreakdown };
  }, [monthlyCardSpends, selectedYear, creditCards]);

  // Open eligible items modal
  const handleOpenCategoryDetails = (cat: CreditCardCategory) => {
    if (!currentCard) return;
    setActiveCategoryDetail({ card: currentCard, category: cat });
    setEditedCategory({
      ...cat,
      eligibleItems: cat.eligibleItems ? [...cat.eligibleItems] : [],
      excludedItems: cat.excludedItems ? [...cat.excludedItems] : [],
    });
    setIsEditingCategory(false);
    setRuleScope('forward');
    setNewEligibleItemInput('');
    setNewExcludedItemInput('');
    setShowEligibleModal(true);
  };

  // Save edited category inside modal
  const handleSaveCategoryChanges = () => {
    if (!activeCategoryDetail || !editedCategory || !currentCard) return;
    
    const sanitizedCategory: CreditCardCategory = {
      ...editedCategory,
      ratePercent: Number(editedCategory.ratePercent) || 0,
      capRM: editedCategory.capRM ? Number(editedCategory.capRM) : undefined,
      conditions: editedCategory.conditions?.trim() || undefined,
      eligibleItems: (editedCategory.eligibleItems && editedCategory.eligibleItems.length > 0) ? editedCategory.eligibleItems : undefined,
      excludedItems: (editedCategory.excludedItems && editedCategory.excludedItems.length > 0) ? editedCategory.excludedItems : undefined,
    };

    if (ruleScope === 'forward') {
      // Flow forward from current month onwards
      const updatedCategories = effectiveCategories.map(c => 
        c.id === activeCategoryDetail.category.id ? sanitizedCategory : c
      );
      overrideCardRulesForMonth(currentCard.id, selectedYear, selectedMonth, updatedCategories);
    } else {
      // Global update across all months
      updateCreditCardCategory(activeCategoryDetail.card.id, activeCategoryDetail.category.id, sanitizedCategory);
    }

    setActiveCategoryDetail({
      ...activeCategoryDetail,
      category: sanitizedCategory,
    });
    setIsEditingCategory(false);
  };

  // Add new category handler
  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard || !newCategoryData.name.trim()) return;

    const newCat: CreditCardCategory = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newCategoryData.name.trim(),
      ratePercent: Number(newCategoryData.ratePercent) || 0,
      capRM: newCategoryData.capRM !== '' && Number(newCategoryData.capRM) > 0 ? Number(newCategoryData.capRM) : undefined,
      conditions: newCategoryData.conditions.trim() || undefined,
      eligibleItems: newCategoryData.eligibleItems.length > 0 ? newCategoryData.eligibleItems : undefined,
      excludedItems: newCategoryData.excludedItems.length > 0 ? newCategoryData.excludedItems : undefined,
    };

    if (newCategoryData.ruleScope === 'forward') {
      const updatedCategories = [...effectiveCategories, newCat];
      overrideCardRulesForMonth(currentCard.id, selectedYear, selectedMonth, updatedCategories);
    } else {
      addCreditCardCategory(currentCard.id, newCat);
    }

    setShowAddCategoryModal(false);
    setNewCategoryData({
      name: '',
      ratePercent: 5.0,
      capRM: '',
      conditions: '',
      eligibleItems: [],
      excludedItems: [],
      ruleScope: 'forward',
    });
    setNewCatEligibleInput('');
    setNewCatExcludedInput('');
  };

  // Delete category handler
  const handleDeleteCategory = (catId: string, scope: 'forward' | 'all' = 'forward') => {
    if (!currentCard) return;
    if (window.confirm('Are you sure you want to remove this transaction category?')) {
      if (scope === 'forward') {
        const updatedCategories = effectiveCategories.filter(c => c.id !== catId);
        overrideCardRulesForMonth(currentCard.id, selectedYear, selectedMonth, updatedCategories);
      } else {
        deleteCreditCardCategory(currentCard.id, catId);
      }
      setShowEligibleModal(false);
    }
  };

  const handleOpenEditCard = (card: CreditCard) => {
    setSelectedCardId(card.id);
    setEditingCard(card);
    setEditCardForm({
      cardName: card.cardName,
      bank: card.bank,
      accountNo: card.accountNo,
      minMonthlySpend: card.minMonthlySpend !== undefined ? card.minMonthlySpend : 0,
      notes: card.notes || '',
    });
    setShowEditCardModal(true);
  };

  const handleSaveEditCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;
    updateCreditCard(editingCard.id, {
      cardName: editCardForm.cardName,
      bank: editCardForm.bank,
      accountNo: editCardForm.accountNo,
      minMonthlySpend: Number(editCardForm.minMonthlySpend) || 0,
      notes: editCardForm.notes,
    });
    setShowEditCardModal(false);
  };

  const handleDeleteCard = (cardId: string) => {
    if (creditCards.length <= 1) {
      alert('You must have at least one credit card in the system.');
      return;
    }
    if (window.confirm('Are you sure you want to remove this credit card?')) {
      deleteCreditCard(cardId);
      setShowEditCardModal(false);
      const remaining = creditCards.filter(c => c.id !== cardId);
      if (remaining.length > 0) {
        setSelectedCardId(remaining[0].id);
      }
    }
  };

  // Category Icon Resolver
  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('petrol') || n.includes('fuel') || n.includes('shell') || n.includes('petronas')) return <Fuel className="w-3.5 h-3.5 text-amber-500" />;
    if (n.includes('grocer') || n.includes('tesco') || n.includes('lotus') || n.includes('giant') || n.includes('jaya')) return <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />;
    if (n.includes('ewallet') || n.includes('tng') || n.includes('wallet') || n.includes('grab') || n.includes('qr')) return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    if (n.includes('dining') || n.includes('food') || n.includes('restaurant') || n.includes('cafe')) return <Utensils className="w-3.5 h-3.5 text-rose-500" />;
    if (n.includes('online') || n.includes('ecom') || n.includes('shopee') || n.includes('lazada') || n.includes('overseas') || n.includes('travel')) return <Globe className="w-3.5 h-3.5 text-indigo-500" />;
    return <CardIcon className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div id="credit-card-cashback-section" className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header & Year Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <YearSelector
            years={allYears}
            selectedYear={selectedYear}
            onSelectYear={val => typeof val === 'number' && setSelectedYear(val)}
            showAllOption={false}
            label="Year"
            onAddYear={yr => {
              setExtraYears(prev => [...prev, yr]);
              setSelectedYear(yr);
            }}
            onDeleteYear={yr => {
              setExtraYears(prev => prev.filter(y => y !== yr));
              setSelectedYear(2026);
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/mobile-card-ui-preview.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-all cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Preview Mobile Card UI</span>
          </a>

          <button
            onClick={() => setShowAddCardModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* Mobile-Friendly Dropdowns for Year, Month & Active Card (Visible on small screens) */}
      <div className="md:hidden bg-white border border-gray-200 rounded-2xl p-3 shadow-xs space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {/* Year Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
              Year
            </label>
            <div className="relative flex items-center">
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full appearance-none bg-gray-50 hover:bg-gray-100 text-gray-900 text-xs font-bold font-mono pl-2.5 pr-7 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {allYears.map(yr => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
            </div>
          </div>

          {/* Month Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
              Month
            </label>
            <div className="relative flex items-center">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full appearance-none bg-gray-50 hover:bg-gray-100 text-gray-900 text-xs font-bold pl-2.5 pr-7 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                {months.map(m => {
                  const hasSpend = monthlyCardSpends.some(
                    s => s.year === selectedYear && s.month === m && s.cardId === selectedCardId
                  );
                  return (
                    <option key={m} value={m}>
                      {m} {selectedYear} {hasSpend ? '•' : ''}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Select Active Card Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block">
            Select Active Card
          </label>
          <div className="relative flex items-center">
            <select
              value={selectedCardId}
              onChange={e => setSelectedCardId(e.target.value)}
              className="w-full appearance-none bg-gray-50 hover:bg-gray-100 text-gray-900 text-xs font-bold pl-2.5 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer truncate"
            >
              {creditCards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.bank} ({card.accountNo})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Credit Card Selector Cards */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {creditCards.map(card => {
          const isSelected = card.id === selectedCardId;

          return (
            <button
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-center min-h-[60px] cursor-pointer ${
                isSelected
                  ? 'bg-white border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold truncate ${
                  isSelected ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {card.bank}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold border border-gray-200">
                  {card.accountNo}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Month Selector Bar (Tablet & Desktop) */}
      <div className="hidden md:flex bg-white p-2.5 rounded-2xl border border-gray-200 shadow-xs items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 pl-2">
          <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
            Month ({selectedYear}):
          </span>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {months.map(m => {
            const hasSpend = monthlyCardSpends.some(
              s => s.year === selectedYear && s.month === m && s.cardId === selectedCardId
            );
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
                  selectedMonth === m
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {m}
                {hasSpend && selectedMonth !== m && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Spend ({selectedMonth} {selectedYear})
          </span>
          <div className="text-xl font-extrabold text-gray-900 font-mono mt-0.5">
            RM {totalMonthlySpend.toFixed(2)}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px]">
            {currentCard?.minMonthlySpend && currentCard.minMonthlySpend > 0 ? (
              totalMonthlySpend >= currentCard.minMonthlySpend ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Unlocked tier (Min RM {currentCard.minMonthlySpend.toFixed(2)})</span>
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1" title={`RM ${(currentCard.minMonthlySpend - totalMonthlySpend).toFixed(2)} needed to reach min spend of RM ${currentCard.minMonthlySpend.toFixed(2)}`}>
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>RM ${(currentCard.minMonthlySpend - totalMonthlySpend).toFixed(2)} to reach min spend (RM {currentCard.minMonthlySpend.toFixed(2)})</span>
                </span>
              )
            ) : (
              <span className="text-gray-500 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>No minimum spend required</span>
              </span>
            )}

            {/* Information Icon allows viewing & setting card minimum spend requirement without adding extra buttons */}
            <button
              type="button"
              id="btn-card-min-spend-info"
              onClick={() => {
                if (currentCard) {
                  setMinSpendInput(currentCard.minMonthlySpend ?? 0);
                  setMinSpendNotes(currentCard.notes || '');
                  setShowMinSpendModal(true);
                }
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
              title="Information & Configure Minimum Spend requirement"
              aria-label="Minimum spend requirement details & settings"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Total Statement Cashback ({selectedMonth} {selectedYear})
          </span>
          <div className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">
            RM {displayTotalCashback.toFixed(2)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Effective Return Rate:{' '}
            <strong className="text-gray-900">
              {totalMonthlySpend > 0
                ? ((displayTotalCashback / totalMonthlySpend) * 100).toFixed(2)
                : '0.00'}
              %
            </strong>
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Annual Total Cashback ({selectedYear})
            </span>
            <div className="text-xl font-extrabold text-blue-600 font-mono mt-0.5">
              RM {annualStatsForYear.totalCashback.toFixed(2)}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Total Spend: RM {annualStatsForYear.totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Category Spend & Eligible Items Table */}
      {currentCard && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-xs">
              {currentCard.bank} ({currentCard.accountNo})
            </h2>
            <button
              onClick={() => {
                setNewCategoryData({
                  name: '',
                  ratePercent: 5.0,
                  capRM: '',
                  conditions: '',
                  eligibleItems: [],
                  excludedItems: [],
                  ruleScope: 'forward',
                });
                setNewCatEligibleInput('');
                setNewCatExcludedInput('');
                setShowAddCategoryModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-900">
              <thead className="bg-gray-50 text-gray-600 text-[10px] font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3 min-w-[170px]">Transaction Category</th>
                  <th className="py-3 px-2 text-center w-16">Rate (%)</th>
                  <th className="py-3 px-2 text-center w-28">Monthly Cap (RM)</th>
                  <th className="py-3 px-3 min-w-[140px]">Monthly Spend (RM)</th>
                  <th className="py-3 px-3 text-right w-28">Calculated</th>
                  <th className="py-3 px-3 text-right w-36">Final Amount (RM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {effectiveCategories.map(cat => {
                  const spend = categorySpends[cat.id] || 0;
                  const isFocused = focusedCatId === cat.id;
                  const formulaVal = isFocused
                    ? (inputFormulas[cat.id] !== undefined
                        ? inputFormulas[cat.id]
                        : (spendFormulas[cat.id] || (spend > 0 ? (spend % 1 === 0 ? String(spend) : String(spend)) : '')))
                    : (spend > 0 ? (spend % 1 === 0 ? String(spend) : spend.toFixed(2)) : '');
                  const cb = calculateCashbackForCat(cat, spend);
                  const rawActual = actualCashbackMap[cat.id] !== undefined ? actualCashbackMap[cat.id] : cb.earned;
                  const actualVal = Math.round(rawActual * 100) / 100;

                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-gray-50/70 transition group"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
                            {getCategoryIcon(cat.name)}
                          </div>
                          <div>
                            <button
                              onClick={() => handleOpenCategoryDetails(cat)}
                              className="font-bold text-gray-900 hover:text-blue-600 transition text-left flex items-center gap-1 cursor-pointer"
                              title="Click to view full eligible criteria & rules"
                            >
                              <span>{cat.name}</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200 text-[11px] inline-block">
                          {cat.ratePercent}%
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-center">
                        <span className="font-semibold text-gray-600 font-mono text-xs">
                          {cat.capRM !== undefined && cat.capRM > 0 ? `RM ${cat.capRM}` : 'No Cap'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-mono text-[10px]">RM</span>
                          <input
                            type="text"
                            value={formulaVal}
                            placeholder="0.00"
                            onFocus={() => handleSpendInputFocus(cat.id, spend)}
                            onChange={e => handleSpendInputChange(cat.id, e.target.value)}
                            onBlur={() => handleSpendInputBlur(cat.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            title={spendFormulas[cat.id] ? `Preserved formula: ${spendFormulas[cat.id]} (Calculated: RM ${spend})` : 'Supports math formulas like 12+12+12'}
                            className="w-full bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg text-gray-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                          />
                        </div>
                        {spendFormulas[cat.id] && !isFocused && (
                          <div className="text-[10px] font-mono text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                            <span className="bg-blue-50 px-1 py-0.2 rounded border border-blue-100" title={`Preserved formula: ${spendFormulas[cat.id]}`}>
                              fx: {spendFormulas[cat.id]}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600">
                        RM {cb.earned.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-400 font-mono text-[10px]">RM</span>
                          <FormattedNumberInput
                            value={actualVal === 0 ? '' : actualVal}
                            placeholder={cb.earned.toFixed(2)}
                            showZeroAsBlank={true}
                            onChange={v => {
                              handleActualCashbackChange(cat.id, Math.round(v * 100) / 100);
                            }}
                            className="w-24 text-right px-1.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs font-mono"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-200 text-gray-900">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-gray-600 uppercase text-[10px] tracking-wider">
                    Total Statement Summary ({selectedMonth} {selectedYear})
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-900 text-xs">
                    RM {totalMonthlySpend.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-indigo-600 font-extrabold text-xs">
                    RM {totalMonthlyCalculatedCashback.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-400 font-mono text-[10px]">RM</span>
                      <FormattedNumberInput
                        value={currentSpendRecord?.finalTotalCashback !== undefined ? currentSpendRecord.finalTotalCashback : ''}
                        placeholder={totalMonthlyFinalCashback.toFixed(2)}
                        onChange={v => {
                          handleFinalTotalCashbackChange(Math.round(v * 100) / 100);
                        }}
                        className="w-24 text-right px-2 py-1 bg-emerald-100 border border-emerald-300 rounded-lg text-emerald-800 font-extrabold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs font-mono shadow-xs"
                      />
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD TRANSACTION CATEGORY */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 border border-gray-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <ListPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Add Transaction Category</h3>
                  <p className="text-[10px] text-gray-500">
                    Define cashback criteria for {currentCard?.bank} ({currentCard?.accountNo})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="p-1 text-gray-400 hover:text-gray-900 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewCategory} className="space-y-3.5 pt-1">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dining, Petrol, Online Shopping..."
                  value={newCategoryData.name}
                  onChange={e => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Cashback Rate (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="e.g. 8.0"
                    value={newCategoryData.ratePercent}
                    onChange={e => setNewCategoryData({ ...newCategoryData, ratePercent: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-gray-900"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-600">Monthly Cap (RM)</label>
                    <span className="text-[10px] text-gray-400">Blank for no cap</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 30 (Optional)"
                    value={newCategoryData.capRM}
                    onChange={e => setNewCategoryData({ ...newCategoryData, capRM: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Criteria / Qualification Rules (MCC & Terms)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Weekend retail dining only (MCC 5812). Min spend RM1000 required across card."
                  value={newCategoryData.conditions}
                  onChange={e => setNewCategoryData({ ...newCategoryData, conditions: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {/* Eligible Merchants Tagging */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 block">
                  Eligible Merchants / Keywords
                </label>
                <div className="flex flex-wrap gap-1.5 min-h-[28px] p-2 bg-gray-50 rounded-xl border border-gray-200">
                  {newCategoryData.eligibleItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-900"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryData({
                            ...newCategoryData,
                            eligibleItems: newCategoryData.eligibleItems.filter((_, i) => i !== idx),
                          });
                        }}
                        className="text-gray-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {newCategoryData.eligibleItems.length === 0 && (
                    <span className="text-[11px] text-gray-400">No specific merchants added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add merchant (e.g. Lotus's, Shell, GrabFood)..."
                    value={newCatEligibleInput}
                    onChange={e => setNewCatEligibleInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCatEligibleInput.trim()) {
                        e.preventDefault();
                        setNewCategoryData({
                          ...newCategoryData,
                          eligibleItems: [...newCategoryData.eligibleItems, newCatEligibleInput.trim()],
                        });
                        setNewCatEligibleInput('');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCatEligibleInput.trim()) return;
                      setNewCategoryData({
                        ...newCategoryData,
                        eligibleItems: [...newCategoryData.eligibleItems, newCatEligibleInput.trim()],
                      });
                      setNewCatEligibleInput('');
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Excluded Merchants Tagging */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 block">
                  Excluded Merchants / Categories (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5 min-h-[28px] p-2 bg-rose-50/50 rounded-xl border border-rose-100">
                  {newCategoryData.excludedItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white border border-rose-200 text-xs font-medium text-rose-700"
                    >
                      <Ban className="w-3 h-3 text-rose-500" />
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryData({
                            ...newCategoryData,
                            excludedItems: newCategoryData.excludedItems.filter((_, i) => i !== idx),
                          });
                        }}
                        className="text-gray-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {newCategoryData.excludedItems.length === 0 && (
                    <span className="text-[11px] text-gray-400">No exclusions specified</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add exclusion (e.g. Government, JomPAY, Insurance)..."
                    value={newCatExcludedInput}
                    onChange={e => setNewCatExcludedInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCatExcludedInput.trim()) {
                        e.preventDefault();
                        setNewCategoryData({
                          ...newCategoryData,
                          excludedItems: [...newCategoryData.excludedItems, newCatExcludedInput.trim()],
                        });
                        setNewCatExcludedInput('');
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newCatExcludedInput.trim()) return;
                      setNewCategoryData({
                        ...newCategoryData,
                        excludedItems: [...newCategoryData.excludedItems, newCatExcludedInput.trim()],
                      });
                      setNewCatExcludedInput('');
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Rule Scope */}
              <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-1.5 text-xs">
                <span className="font-bold text-blue-700 block text-[11px]">Apply Category:</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 font-medium">
                    <input
                      type="radio"
                      name="addRuleScope"
                      checked={newCategoryData.ruleScope === 'forward'}
                      onChange={() => setNewCategoryData({ ...newCategoryData, ruleScope: 'forward' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>From {selectedMonth} {selectedYear} onwards (flow to future months)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 font-medium">
                    <input
                      type="radio"
                      name="addRuleScope"
                      checked={newCategoryData.ruleScope === 'all'}
                      onChange={() => setNewCategoryData({ ...newCategoryData, ruleScope: 'all' })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span>All months globally</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ELIGIBLE ITEMS & CASHBACK CONDITIONS DETAIL MODAL */}
      {showEligibleModal && activeCategoryDetail && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5 border border-gray-200 max-h-[90vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  {getCategoryIcon(activeCategoryDetail.category.name)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                      {activeCategoryDetail.card.bank} ({activeCategoryDetail.card.accountNo})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {activeCategoryDetail.category.ratePercent}% Cashback
                    </span>
                  </div>
                  {isEditingCategory ? (
                    <input
                      type="text"
                      value={editedCategory?.name || ''}
                      onChange={e => setEditedCategory(prev => prev ? { ...prev, name: e.target.value } : prev)}
                      className="text-sm font-bold text-gray-900 mt-0.5 border border-gray-300 rounded px-1.5 py-0.5 w-full max-w-[240px]"
                    />
                  ) : (
                    <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                      {activeCategoryDetail.category.name}
                    </h3>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingCategory(!isEditingCategory)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    isEditingCategory
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'
                  }`}
                  title="Customize rules and eligible items"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isEditingCategory ? 'Editing' : 'Edit Rules'}</span>
                </button>
                <button
                  onClick={() => setShowEligibleModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-900 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              {/* Category Rules & Caps summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] font-medium">Rebate Rate</span>
                  {isEditingCategory && editedCategory ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editedCategory.ratePercent}
                      onChange={e => setEditedCategory({ ...editedCategory, ratePercent: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold font-mono text-gray-900"
                    />
                  ) : (
                    <span className="font-bold text-gray-900 text-sm">
                      {activeCategoryDetail.category.ratePercent}%
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-medium">Monthly Cap</span>
                  {isEditingCategory && editedCategory ? (
                    <input
                      type="number"
                      step="1"
                      placeholder="No cap"
                      value={editedCategory.capRM !== undefined ? editedCategory.capRM : ''}
                      onChange={e => {
                        const val = parseFloat(e.target.value);
                        setEditedCategory({ ...editedCategory, capRM: !isNaN(val) && val > 0 ? val : undefined });
                      }}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold font-mono text-gray-900"
                    />
                  ) : (
                    <span className="font-bold text-gray-900 text-sm">
                      {activeCategoryDetail.category.capRM
                        ? `RM ${activeCategoryDetail.category.capRM.toFixed(2)}`
                        : 'No Cap'}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-medium">Optimal Spend</span>
                  <span className="font-bold text-blue-600 text-sm">
                    {activeCategoryDetail.category.capRM
                      ? `RM ${(activeCategoryDetail.category.capRM / (activeCategoryDetail.category.ratePercent / 100)).toFixed(0)}`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Forward Rule Scope Selection when Editing */}
              {isEditingCategory && (
                <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl space-y-1.5 text-xs">
                  <span className="font-bold text-blue-700 block text-[11px]">Apply Rule Changes:</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 font-medium">
                      <input
                        type="radio"
                        name="ruleScope"
                        checked={ruleScope === 'forward'}
                        onChange={() => setRuleScope('forward')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>From {selectedMonth} {selectedYear} onwards (flow to future months)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-800 font-medium">
                      <input
                        type="radio"
                        name="ruleScope"
                        checked={ruleScope === 'all'}
                        onChange={() => setRuleScope('all')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>All months globally</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conditions & Eligibility Details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-xs font-bold text-gray-900 uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Terms & Qualification Rules</span>
                </div>
                {isEditingCategory && editedCategory ? (
                  <textarea
                    value={editedCategory.conditions || ''}
                    onChange={e =>
                      setEditedCategory({ ...editedCategory, conditions: e.target.value })
                    }
                    rows={2}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter qualifying rules, MCC codes..."
                  />
                ) : (
                  <p className="text-xs text-gray-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 leading-relaxed">
                    {activeCategoryDetail.category.conditions ||
                      'Standard retail transactions eligible under bank campaign MCC classifications.'}
                  </p>
                )}
              </div>

              {/* Explicit Eligible Items / Merchants */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-gray-900 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Eligible Merchants ({editedCategory?.eligibleItems?.length || 0})</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(isEditingCategory ? editedCategory?.eligibleItems : activeCategoryDetail.category.eligibleItems)?.map(
                      (item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-900"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{item}</span>
                          {isEditingCategory && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!editedCategory) return;
                                const updated = (editedCategory.eligibleItems || []).filter(
                                  (_, i) => i !== idx
                                );
                                setEditedCategory({ ...editedCategory, eligibleItems: updated });
                              }}
                              className="text-gray-400 hover:text-rose-600 ml-1 cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      )
                    )}
                  </div>

                  {/* Add new eligible item tag */}
                  {isEditingCategory && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      <input
                        type="text"
                        placeholder="Add merchant (e.g. Jaya Grocer, Setel)..."
                        value={newEligibleItemInput}
                        onChange={e => setNewEligibleItemInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newEligibleItemInput.trim()) {
                            e.preventDefault();
                            if (!editedCategory) return;
                            const items = editedCategory.eligibleItems || [];
                            setEditedCategory({
                              ...editedCategory,
                              eligibleItems: [...items, newEligibleItemInput.trim()],
                            });
                            setNewEligibleItemInput('');
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newEligibleItemInput.trim() || !editedCategory) return;
                          const items = editedCategory.eligibleItems || [];
                          setEditedCategory({
                            ...editedCategory,
                            eligibleItems: [...items, newEligibleItemInput.trim()],
                          });
                          setNewEligibleItemInput('');
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Excluded Merchants & Transactions */}
              {((isEditingCategory ? editedCategory?.excludedItems : activeCategoryDetail.category.excludedItems)?.length || isEditingCategory) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Excluded Transactions ({editedCategory?.excludedItems?.length || activeCategoryDetail.category.excludedItems?.length || 0})</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(isEditingCategory ? editedCategory?.excludedItems : activeCategoryDetail.category.excludedItems)?.map(
                        (item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-700"
                          >
                            <Ban className="w-3 h-3 text-rose-500" />
                            <span>{item}</span>
                            {isEditingCategory && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editedCategory) return;
                                  const updated = (editedCategory.excludedItems || []).filter(
                                    (_, i) => i !== idx
                                  );
                                  setEditedCategory({ ...editedCategory, excludedItems: updated });
                                }}
                                className="text-gray-400 hover:text-rose-600 ml-1 cursor-pointer"
                              >
                                &times;
                              </button>
                            )}
                          </span>
                        )
                      )}
                    </div>

                    {isEditingCategory && (
                      <div className="flex items-center gap-2 pt-2 border-t border-rose-100">
                        <input
                          type="text"
                          placeholder="Add excluded item (e.g. Government, JomPAY)..."
                          value={newExcludedItemInput}
                          onChange={e => setNewExcludedItemInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newExcludedItemInput.trim()) {
                              e.preventDefault();
                              if (!editedCategory) return;
                              const items = editedCategory.excludedItems || [];
                              setEditedCategory({
                                ...editedCategory,
                                excludedItems: [...items, newExcludedItemInput.trim()],
                              });
                              setNewExcludedItemInput('');
                            }
                          }}
                          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newExcludedItemInput.trim() || !editedCategory) return;
                            const items = editedCategory.excludedItems || [];
                            setEditedCategory({
                              ...editedCategory,
                              excludedItems: [...items, newExcludedItemInput.trim()],
                            });
                            setNewExcludedItemInput('');
                          }}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleDeleteCategory(activeCategoryDetail.category.id, ruleScope)}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>

              <div className="flex items-center gap-2">
                {isEditingCategory ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingCategory(false);
                        setEditedCategory({ ...activeCategoryDetail.category });
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCategoryChanges}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowEligibleModal(false)}
                    className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: ADD NEW CREDIT CARD */}
      {showAddCardModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Add Credit Card</h3>
              <button
                onClick={() => setShowAddCardModal(false)}
                className="p-1 text-gray-400 hover:text-gray-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newCardForm.cardName) return;

                addCreditCard({
                  cardName: newCardForm.cardName,
                  bank: newCardForm.bank || 'Bank',
                  accountNo: newCardForm.accountNo || '0000',
                  minMonthlySpend: Number(newCardForm.minMonthlySpend) || 0,
                  notes: newCardForm.notes,
                  categories: [
                    {
                      id: `c_${Date.now()}_1`,
                      name: 'Retail & Base Rate',
                      ratePercent: 0.2,
                      eligibleItems: ['All general transactions'],
                      conditions: 'Base cashback on all spending',
                    },
                    {
                      id: `c_${Date.now()}_2`,
                      name: 'Groceries',
                      ratePercent: 5.0,
                      capRM: 30,
                      eligibleItems: ["Lotus's", 'Giant', 'Jaya Grocer', 'GrabFood'],
                      conditions: 'MCC 5411 / 5812',
                    },
                    {
                      id: `c_${Date.now()}_3`,
                      name: 'Petrol',
                      ratePercent: 5.0,
                      capRM: 30,
                      eligibleItems: ['Shell', 'Petronas', 'Caltex'],
                      conditions: 'MCC 5541 / 5542',
                    },
                  ],
                });

                setShowAddCardModal(false);
                setNewCardForm({
                  cardName: '',
                  bank: '',
                  accountNo: '',
                  minMonthlySpend: 1000,
                  notes: '',
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Card Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maybank 2 Gold (1234)"
                  value={newCardForm.cardName}
                  onChange={e => setNewCardForm({ ...newCardForm, cardName: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Maybank"
                    value={newCardForm.bank}
                    onChange={e => setNewCardForm({ ...newCardForm, bank: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    placeholder="e.g. 1234"
                    value={newCardForm.accountNo}
                    onChange={e => setNewCardForm({ ...newCardForm, accountNo: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">
                  Min Monthly Spend for Max Tier (RM)
                </label>
                <input
                  type="number"
                  value={newCardForm.minMonthlySpend}
                  onChange={e =>
                    setNewCardForm({
                      ...newCardForm,
                      minMonthlySpend: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCardModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Create Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT / CROSS-CHECK CREDIT CARD DETAILS */}
      {showEditCardModal && editingCard && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                  <CardIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Card Details & Rules</h3>
                  <p className="text-[10px] text-gray-500">Cross-check & amend card parameters</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditCardModal(false)}
                className="p-1 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCard} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Card Name</label>
                <input
                  type="text"
                  placeholder="e.g. HSBC (5458)"
                  value={editCardForm.cardName}
                  onChange={e => setEditCardForm({ ...editCardForm, cardName: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HSBC"
                    value={editCardForm.bank}
                    onChange={e => setEditCardForm({ ...editCardForm, bank: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    placeholder="e.g. 5458"
                    value={editCardForm.accountNo}
                    onChange={e => setEditCardForm({ ...editCardForm, accountNo: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">
                    Min Monthly Spend for Max Tier (RM)
                  </label>
                  <span className="text-[10px] text-gray-400">Set 0 if no minimum required</span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={editCardForm.minMonthlySpend}
                  onChange={e =>
                    setEditCardForm({
                      ...editCardForm,
                      minMonthlySpend: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Notes & Rules Info</label>
                <textarea
                  rows={2}
                  placeholder="Special conditions or tier requirements..."
                  value={editCardForm.notes}
                  onChange={e => setEditCardForm({ ...editCardForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteCard(editingCard.id)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Card</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditCardModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Minimum Spend Info & Configuration Modal (Opened directly from Info Icon) */}
      {showMinSpendModal && currentCard && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Minimum Monthly Spend Requirement
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    {currentCard.bank} ({currentCard.accountNo})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMinSpendModal(false)}
                className="text-gray-400 hover:text-gray-900 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Set Min Spend Form */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 block">
                  Set Minimum Spend Threshold (RM)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    RM
                  </span>
                  <FormattedNumberInput
                    value={minSpendInput}
                    onChange={v => setMinSpendInput(v)}
                    placeholder="e.g. 2,000"
                    className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMinSpendModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const num = Math.max(0, parseFloat(String(minSpendInput)) || 0);
                  updateCreditCard(currentCard.id, {
                    minMonthlySpend: num,
                  });
                  setShowMinSpendModal(false);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Minimum Spend</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
