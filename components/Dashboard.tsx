import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area, LineChart, Line
} from 'recharts';
import { Transaction, Category } from '../types';
import { Wallet, TrendingDown, TrendingUp, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  potentialDuplicatesCount: number;
  onNavigateToDuplicates: () => void;
  currency: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  categories, 
  potentialDuplicatesCount,
  onNavigateToDuplicates,
  currency
}) => {
  const [timeRange, setTimeRange] = useState<'30_days' | '90_days'>('30_days');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(amount);
  };

  // Helper: Get Month Name
  const getMonthName = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('default', { month: 'short' });
  };

  // 1. Calculate Periods (Current Month vs Previous Month based on latest transaction)
  const periodStats = useMemo(() => {
    if (transactions.length === 0) return { 
        currentIncome: 0, currentExpense: 0, 
        prevIncome: 0, prevExpense: 0, 
        balance: 0 
    };

    // Find the latest date in transactions to define "Current Month"
    const sortedDates = transactions.map(t => new Date(t.date).getTime()).sort((a, b) => b - a);
    const latestDate = new Date(sortedDates[0]);
    
    const currentMonth = latestDate.getMonth();
    const currentYear = latestDate.getFullYear();
    
    // Previous Month Logic
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    let currentIncome = 0;
    let currentExpense = 0;
    let prevIncome = 0;
    let prevExpense = 0;

    transactions.forEach(t => {
        if (t.status !== 'verified') return; // Only count verified

        const tDate = new Date(t.date);
        const tMonth = tDate.getMonth();
        const tYear = tDate.getFullYear();

        if (tMonth === currentMonth && tYear === currentYear) {
            if (t.isExpense) currentExpense += t.amount;
            else currentIncome += t.amount;
        } else if (tMonth === prevMonth && tYear === prevYear) {
            if (t.isExpense) prevExpense += t.amount;
            else prevIncome += t.amount;
        }
    });

    return {
        currentIncome,
        currentExpense,
        prevIncome,
        prevExpense,
        balance: currentIncome - currentExpense,
        monthLabel: latestDate.toLocaleString('default', { month: 'long' })
    };
  }, [transactions]);

  // 2. Trend Data (Daily Spending)
  const trendData = useMemo(() => {
      if (transactions.length === 0) return [];

      const daysMap = new Map<string, number>();
      
      // Determine cutoff date based on filter
      const now = new Date();
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - (timeRange === '30_days' ? 30 : 90));

      // Pre-fill days with 0
      for (let d = new Date(cutoff); d <= now; d.setDate(d.getDate() + 1)) {
          const key = d.toISOString().split('T')[0];
          daysMap.set(key, 0);
      }

      transactions.forEach(t => {
          if (t.isExpense && t.status === 'verified') {
              // We use the transaction date directly. 
              // In a real app, we might handle timezone offsets more carefully.
              if (daysMap.has(t.date)) {
                  daysMap.set(t.date, (daysMap.get(t.date) || 0) + t.amount);
              }
          }
      });

      return Array.from(daysMap.entries())
          .map(([date, amount]) => ({
              date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              fullDate: date,
              amount
          }))
          .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [transactions, timeRange]);

  // 3. Comparison Chart Data (This Month vs Last Month)
  const comparisonData = useMemo(() => {
      return [
          { name: 'Income', current: periodStats.currentIncome, prev: periodStats.prevIncome },
          { name: 'Expenses', current: periodStats.currentExpense, prev: periodStats.prevExpense }
      ];
  }, [periodStats]);

  // 4. Category Breakdown
  const categoryData = useMemo(() => {
    const verifiedExpenses = transactions.filter(t => t.isExpense && t.status === 'verified');
    const grouped = verifiedExpenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => {
      const cat = categories.find(c => c.name === name);
      return { name, value: value as number, color: cat ? cat.color : '#cbd5e1' };
    }).sort((a, b) => b.value - a.value); // Sort desc
  }, [transactions, categories]);

  const calculateChange = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0;
      return ((current - prev) / prev) * 100;
  };

  const expenseChange = calculateChange(periodStats.currentExpense, periodStats.prevExpense);
  const incomeChange = calculateChange(periodStats.currentIncome, periodStats.prevIncome);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Financial Overview</h2>
           <p className="text-slate-400">Snapshot for {periodStats.monthLabel}</p>
        </div>
        
        {/* Alerts / Actions */}
        {potentialDuplicatesCount > 0 && (
            <button 
            onClick={onNavigateToDuplicates}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
            <AlertCircle size={18} />
            <span>{potentialDuplicatesCount} items to review</span>
            </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} className="text-indigo-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Net Balance</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(periodStats.balance)}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
             <span className="bg-slate-800 px-2 py-0.5 rounded">Current Period</span>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={48} className="text-emerald-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Income</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(periodStats.currentIncome)}</p>
          <div className="flex items-center gap-2 text-xs">
             <span className={`flex items-center gap-1 font-medium ${incomeChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {incomeChange >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(incomeChange).toFixed(1)}%
             </span>
             <span className="text-slate-500">vs last month</span>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown size={48} className="text-rose-500" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Expenses</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-2">{formatCurrency(periodStats.currentExpense)}</p>
          <div className="flex items-center gap-2 text-xs">
             <span className={`flex items-center gap-1 font-medium ${expenseChange <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {expenseChange > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {Math.abs(expenseChange).toFixed(1)}%
             </span>
             <span className="text-slate-500">vs last month</span>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 h-[400px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Activity size={18} className="text-indigo-400" />
                    Spending Trend
                </h3>
                <p className="text-sm text-slate-400">Daily spending activity over time</p>
            </div>
            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                <button 
                  onClick={() => setTimeRange('30_days')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === '30_days' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    30 Days
                </button>
                <button 
                   onClick={() => setTimeRange('90_days')}
                   className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeRange === '90_days' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    90 Days
                </button>
            </div>
        </div>
        <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis 
                    tick={{fontSize: 12, fill: '#64748b'}} 
                    tickFormatter={(val) => `$${val}`}
                    tickLine={false}
                    axisLine={false}
                />
                <RechartsTooltip 
                  cursor={{stroke: '#475569', strokeDasharray: '5 5'}}
                  formatter={(value: number) => [formatCurrency(value), 'Spent']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison & Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Comparison */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 h-96 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2">Period Comparison</h3>
          <p className="text-sm text-slate-400 mb-6">Current Month vs Previous Month</p>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(val) => `$${val/1000}k`} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{fill: '#1e293b'}}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                />
                <Bar dataKey="prev" name="Last Month" fill="#334155" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="current" name="This Month" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Vertical Bar) */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 h-96 flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-2">Spending by Category</h3>
          <p className="text-sm text-slate-400 mb-6">Where your money went this period</p>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11, fill: '#94a3b8'}} stroke="transparent" />
                <RechartsTooltip 
                  cursor={{fill: '#1e293b'}}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: '8px', border: '1px solid #334155' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
