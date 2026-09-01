import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

export type InfoTooltipType = 'synced' | 'editable' | 'info';

interface InfoTooltipProps {
  type?: InfoTooltipType;
  tooltip: string;
  label?: React.ReactNode;
  header?: string;
  position?: 'top' | 'bottom';
  align?: 'center' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

/**
 * Standardised Information Icon Component with Portal-based Rendering
 * 
 * • Grey ⓘ ('synced' | 'info'): Indicates value is auto-synced or contains calculation/entry notes.
 * • Blue ⓘ ('editable'): Indicates the value can be manually edited / updated by the user.
 * 
 * Uses React Portal to document.body to ensure tooltips are never clipped by
 * table boundaries, overflow containers, or sticky table columns.
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  type = 'synced',
  tooltip,
  label,
  header,
  position: preferredPosition = 'bottom',
  className = '',
  iconClassName = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    arrowLeft: number;
    placement: 'top' | 'bottom';
  } | null>(null);

  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!iconRef.current) return;

    const iconRect = iconRef.current.getBoundingClientRect();
    const tooltipWidth = 210; // Expected max width
    const tooltipHeight = 55; // Estimated height for calculation

    // Calculate horizontal positioning centered on the (i) icon
    const iconCenterX = iconRect.left + iconRect.width / 2;
    let left = iconCenterX - tooltipWidth / 2;

    // Viewport edge collision padding (12px minimum margin from screen edges)
    const margin = 12;
    if (left < margin) {
      left = margin;
    } else if (left + tooltipWidth > window.innerWidth - margin) {
      left = window.innerWidth - margin - tooltipWidth;
    }

    // Calculate arrow relative to the tooltip box
    const arrowLeft = Math.max(10, Math.min(tooltipWidth - 10, iconCenterX - left));

    // Determine vertical placement (flip to top if space below is limited)
    const spaceBelow = window.innerHeight - iconRect.bottom;
    const spaceAbove = iconRect.top;
    
    let placement: 'top' | 'bottom' = preferredPosition === 'top' ? 'top' : 'bottom';
    if (placement === 'bottom' && spaceBelow < tooltipHeight + 20 && spaceAbove > tooltipHeight + 20) {
      placement = 'top';
    } else if (placement === 'top' && spaceAbove < tooltipHeight + 20 && spaceBelow > tooltipHeight + 20) {
      placement = 'bottom';
    }

    let top = 0;
    if (placement === 'top') {
      top = iconRect.top - 8; // Tooltip height translated via -translate-y-full
    } else {
      top = iconRect.bottom + 8;
    }

    setCoords({ top, left, arrowLeft, placement });
  }, [preferredPosition]);

  const show = () => {
    updatePosition();
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        iconRef.current &&
        !iconRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isVisible, updatePosition]);

  const isSynced = type === 'synced';
  const isEditable = type === 'editable';

  const badgeColors = isSynced
    ? 'bg-transparent text-[#8C8275] hover:text-[#524B42]'
    : isEditable
    ? 'bg-transparent text-[#2563EB] hover:text-[#1D4ED8]'
    : 'bg-transparent text-[#8C8275] hover:text-[#524B42]';

  return (
    <span
      className={`inline-flex items-center gap-1 cursor-help select-none ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => {
        e.stopPropagation();
        if (isVisible) {
          hide();
        } else {
          show();
        }
      }}
    >
      {label && <span>{label}</span>}
      <span
        ref={iconRef}
        className={`inline-flex items-center justify-center transition-colors ${badgeColors} ${iconClassName}`}
      >
        <Info className="w-3 h-3 stroke-[1.8]" />
      </span>

      {/* Render tooltip in portal attached directly to document.body */}
      {isVisible && coords && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.placement === 'top' ? 'translateY(-100%)' : 'none'
          }}
          className="fixed w-[210px] px-2.5 py-2 bg-[#1E1B18] text-white rounded-lg shadow-2xl z-[99999] pointer-events-none text-left normal-case font-sans font-normal tracking-normal text-[11px] leading-snug break-words animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center gap-1 font-semibold text-[10px] mb-0.5 tracking-normal">
            {header ? (
              <span className="text-[#C4BBAE] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A89E90]" />
                {header}
              </span>
            ) : isSynced ? (
              <span className="text-[#C4BBAE] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A89E90]" />
                Synced from
              </span>
            ) : isEditable ? (
              <span className="text-[#93C5FD] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
                Editable
              </span>
            ) : (
              <span className="text-[#C4BBAE] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A89E90]" />
                Info
              </span>
            )}
          </div>
          <div className="text-[#EDE8DF]">{tooltip}</div>

          {/* Arrow pointer positioned exactly above/below the icon */}
          <div
            style={{ left: `${coords.arrowLeft}px` }}
            className={`absolute -translate-x-1/2 border-4 border-transparent ${
              coords.placement === 'top'
                ? 'top-full border-t-[#1E1B18]'
                : 'bottom-full border-b-[#1E1B18]'
            }`}
          />
        </div>,
        document.body
      )}
    </span>
  );
};

export default InfoTooltip;
