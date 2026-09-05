import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calculator,
  Equal,
  Sparkles,
  HelpCircle,
  FileText,
  ListPlus,
  Check
} from 'lucide-react';
import { parseLedgerText, evaluateMathExpression } from '../utils/calcEvaluator';

interface LedgerCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountName: string;
  month: string;
  year: number;
  currency: string;
  initialNotes: string;
  initialValue: number;
  onSave: (notes: string, total: number) => void;
}

interface LineItem {
  id: string;
  label: string;
  expression: string;
}

export const LedgerCalculatorModal: React.FC<LedgerCalculatorModalProps> = ({
  isOpen,
  onClose,
  accountName,
  month,
  year,
  currency,
  initialNotes,
  initialValue,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'structured' | 'raw'>('structured');
  const [rawText, setRawText] = useState(initialNotes || '');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  // Initialize line items from initialNotes or initialValue
  useEffect(() => {
    if (initialNotes && initialNotes.trim()) {
      setRawText(initialNotes);
      const parsed = parseLedgerText(initialNotes);
      setLineItems(
        parsed.lines.map(l => ({
          id: l.id,
          label: l.label,
          expression: l.expression
        }))
      );
    } else if (initialValue > 0) {
      const defaultStr = `${initialValue}`;
      setRawText(defaultStr);
      setLineItems([
        {
          id: 'item-1',
          label: '',
          expression: defaultStr
        }
      ]);
    } else {
      setRawText('');
      setLineItems([
        {
          id: 'item-1',
          label: '',
          expression: ''
        }
      ]);
    }
  }, [initialNotes, initialValue, isOpen]);

  // Real-time evaluation of current state
  const currentEvaluation = useMemo(() => {
    if (activeTab === 'raw') {
      return parseLedgerText(rawText);
    } else {
      const constructedText = lineItems
        .map(item => {
          const l = item.label.trim();
          const e = item.expression.trim();
          if (!l && !e) return '';
          if (l && e) return `${l}: ${e}`;
          if (l && !e) return `${l}: 0`;
          return e;
        })
        .filter(Boolean)
        .join('\n');
      return parseLedgerText(constructedText);
    }
  }, [activeTab, rawText, lineItems]);

  if (!isOpen) return null;

  const handleAddLine = () => {
    setLineItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        label: '',
        expression: ''
      }
    ]);
  };

  const handleRemoveLine = (id: string) => {
    setLineItems(prev => {
      const next = prev.filter(item => item.id !== id);
      return next.length > 0
        ? next
        : [{ id: `item-${Date.now()}`, label: '', expression: '' }];
    });
  };

  const handleUpdateLine = (id: string, field: 'label' | 'expression', value: string) => {
    setLineItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleTabSwitch = (newTab: 'structured' | 'raw') => {
    if (newTab === 'raw' && activeTab === 'structured') {
      // Sync structured -> raw
      const constructed = lineItems
        .map(item => {
          const l = item.label.trim();
          const e = item.expression.trim();
          if (!l && !e) return '';
          if (l && e) return `${l}: ${e}`;
          if (l && !e) return `${l}: 0`;
          return e;
        })
        .filter(Boolean)
        .join('\n');
      setRawText(constructed);
    } else if (newTab === 'structured' && activeTab === 'raw') {
      // Sync raw -> structured
      const parsed = parseLedgerText(rawText);
      if (parsed.lines.length > 0) {
        setLineItems(
          parsed.lines.map(l => ({
            id: l.id,
            label: l.label,
            expression: l.expression
          }))
        );
      } else {
        setLineItems([{ id: `item-${Date.now()}`, label: '', expression: '' }]);
      }
    }
    setActiveTab(newTab);
  };

  const handleSave = () => {
    let finalNotes = '';
    if (activeTab === 'raw') {
      finalNotes = rawText.trim();
    } else {
      finalNotes = lineItems
        .map(item => {
          const l = item.label.trim();
          const e = item.expression.trim();
          if (!l && !e) return '';
          if (l && e) return `${l}: ${e}`;
          if (l && !e) return `${l}: 0`;
          return e;
        })
        .filter(Boolean)
        .join('\n');
    }

    const evalResult = parseLedgerText(finalNotes);
    onSave(finalNotes, evalResult.total);
    onClose();
  };

  const handleQuickInsertPreset = (preset: 'bankSplit' | 'simpleSum') => {
    if (preset === 'bankSplit') {
      const template = [
        { id: `item-${Date.now()}-1`, label: 'MAE', expression: '66.5 - 54.5' },
        { id: `item-${Date.now()}-2`, label: 'Yi RYT', expression: '9.48' },
        { id: `item-${Date.now()}-3`, label: 'RYT', expression: '64.91' },
        { id: `item-${Date.now()}-4`, label: 'Boost', expression: '48.83 - 36.7' }
      ];
      setLineItems(template);
      setActiveTab('structured');
    } else if (preset === 'simpleSum') {
      const template = [
        { id: `item-${Date.now()}-1`, label: 'Dividend A', expression: '120.50' },
        { id: `item-${Date.now()}-2`, label: 'Dividend B', expression: '85.20 * 0.95' }
      ];
      setLineItems(template);
      setActiveTab('structured');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-gray-900 text-base">
                  {accountName}
                </h3>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
                  {month} {year}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Multi-line calculation ledger & formula calculator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Total Bar */}
        <div className="bg-blue-50/60 border-b border-blue-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              Computed Total:
            </span>
            <span className="text-[11px] text-blue-600">
              ({currentEvaluation.lines.filter(l => l.isValid).length} line items)
            </span>
          </div>
          <div className="text-right">
            <div className="text-xl font-extrabold font-mono text-blue-700">
              {currency} {currentEvaluation.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Mode Switch & Actions */}
        <div className="px-5 py-2.5 bg-white border-b border-gray-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => handleTabSwitch('structured')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'structured'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Line Items</span>
            </button>
            <button
              onClick={() => handleTabSwitch('raw')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'raw'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Multi-line Text</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 text-gray-400 hover:text-gray-900 rounded-md transition-colors cursor-pointer"
              title="Supported syntax & tips"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Help Accordion */}
        {showHelp && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Calculation & Syntax Tips:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
              <li>Use <code>Label: Math Expression</code> (e.g. <code>MAE: 66.5 - 54.5</code>)</li>
              <li>Supports operators: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>×</code>, <code>÷</code>, <code>( )</code>, <code>%</code></li>
              <li>Currency prefixes like <code>RM</code> or <code>$</code> are automatically handled</li>
            </ul>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-gray-50/40">
          {activeTab === 'structured' ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-gray-500 uppercase px-1">
                <div className="col-span-4">Source / Note</div>
                <div className="col-span-5">Calculation Formula</div>
                <div className="col-span-2 text-right">Result</div>
                <div className="col-span-1"></div>
              </div>

              {lineItems.map((item, idx) => {
                const evalLine = currentEvaluation.lines[idx];
                const isValid = evalLine?.isValid;
                const result = evalLine?.result ?? 0;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-gray-200 shadow-2xs hover:border-blue-300 transition-all"
                  >
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="e.g. MAE, Yi RYT..."
                        value={item.label}
                        onChange={e => handleUpdateLine(item.id, 'label', e.target.value)}
                        className="w-full text-xs font-semibold text-gray-900 bg-transparent focus:outline-none placeholder-gray-400"
                      />
                    </div>
                    <div className="col-span-5 flex items-center gap-1.5">
                      <span className="text-gray-400 text-xs font-mono">:</span>
                      <input
                        type="text"
                        placeholder="e.g. 66.5 - 54.5"
                        value={item.expression}
                        onChange={e => handleUpdateLine(item.id, 'expression', e.target.value)}
                        className="w-full text-xs font-mono font-bold text-gray-900 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none placeholder-gray-400"
                      />
                    </div>
                    <div className="col-span-2 text-right font-mono font-bold text-xs text-blue-700">
                      {isValid ? result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => handleRemoveLine(item.id)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        title="Delete line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-500">Preset:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickInsertPreset('bankSplit')}
                    className="text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition-all cursor-pointer"
                  >
                    Digital Banks Split
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-900">
                Enter formulas or notes line by line:
              </label>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                placeholder={`MAE: 66.5 - 54.5\nYi RYT: 9.48\nRYT: 64.91\nBoost: 48.83 - 36.7`}
                rows={7}
                className="w-full font-mono text-xs text-gray-900 p-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none placeholder-gray-400 leading-relaxed resize-none shadow-2xs"
              />
              <p className="text-[11px] text-gray-500">
                Each line will be evaluated automatically. Lines with colons (e.g. <code>Label: 10 + 20</code>) will save the label and compute the math.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save & Apply ({currency} {currentEvaluation.total.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
