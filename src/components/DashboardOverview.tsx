import React from 'react';
import { BalanceSheetView } from './BalanceSheetView';

interface DashboardOverviewProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAi?: () => void;
  onOpenSettings?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = () => {
  return (
    <div id="dashboard-overview-container" className="space-y-5">
      {/* Main Annual Report / Balance Sheet View */}
      <BalanceSheetView />
    </div>
  );
};
