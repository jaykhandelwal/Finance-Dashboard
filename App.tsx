import React, { useState, useEffect } from 'react';
import { LayoutDashboard, List, UploadCloud, AlertCircle, Settings, Menu, X, Tag as TagIcon, ListFilter, Wallet, HandCoins, Activity, Sparkles, Globe, Zap } from 'lucide-react';
import { Transaction, Category, DuplicatePair, DEFAULT_CATEGORIES, ViewState, Account, DEFAULT_ACCOUNTS, Rule, DEFAULT_RULES } from './types';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { UploadSection } from './components/UploadSection';
import { ReviewCenter } from './components/ReviewDuplicates';
import { CategoryManager } from './components/CategoryManager';
import { TagManager } from './components/TagManager';
import { AccountManager } from './components/AccountManager';
import { LendingDashboard } from './components/LendingDashboard';
import { RuleManager } from './components/RuleManager';

// Mock initial data linked to accounts
const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: 'tx-1', date: '2023-10-25', amount: 120.50, originalDescription: 'WHOLEFDS SJC 1024', enhancedDescription: 'Whole Foods Market', category: 'Groceries', tags: ['Organic', 'Food'], source: 'Chase Sapphire', accountId: 'acc-1', isExpense: true, status: 'verified', confidence: 95, isReviewed: false },
  { id: 'tx-2', date: '2023-10-24', amount: 15.00, originalDescription: 'UBER TRIP HELP.UBER.COM', enhancedDescription: 'Uber Ride', category: 'Travel', tags: ['Rideshare', 'Taxi'], source: 'Chase Sapphire', accountId: 'acc-1', isExpense: true, status: 'verified', confidence: 98, isReviewed: true },
  { id: 'tx-3', date: '2023-10-24', amount: 4500.00, originalDescription: 'DIRECT DEP GOGGLE INC', enhancedDescription: 'Google Salary', category: 'Income', tags: ['Salary', 'Tech'], source: 'Wells Fargo Checking', accountId: 'acc-2', isExpense: false, status: 'verified', confidence: 100, isReviewed: true },
  { id: 'tx-4', date: '2023-10-23', amount: 89.99, originalDescription: 'INTERNET SVC BILL', enhancedDescription: 'Comcast Internet', category: 'Utilities', tags: ['Internet', 'Home Office'], source: 'Chase Sapphire', accountId: 'acc-1', isExpense: true, status: 'verified', confidence: 92, isReviewed: false },
  { id: 'tx-5', date: '2023-10-20', amount: 12.50, originalDescription: 'UNK MERCH 4022', enhancedDescription: 'Unknown Merchant', category: 'Other', tags: [], source: 'Chase Sapphire', accountId: 'acc-1', isExpense: true, status: 'needs_review', confidence: 45, isReviewed: false },
];

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [accounts, setAccounts] = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [rules, setRules] = useState<Rule[]>(DEFAULT_RULES);
  const [potentialDuplicates, setPotentialDuplicates] = useState<DuplicatePair[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Global Settings State
  const [currency, setCurrency] = useState('USD');
  const [settingsTab, setSettingsTab] = useState<'general' | 'categories' | 'tags' | 'accounts' | 'rules'>('general');

  // Rule Execution Logic
  const applyRulesToTransaction = (tx: Transaction, rulesList: Rule[]): Transaction => {
    let modifiedTx = { ...tx };
    
    rulesList.filter(r => r.isActive).forEach(rule => {
      let isMatch = false;
      
      const valToCheck = rule.criteria.field === 'amount' 
         ? modifiedTx.amount 
         : (modifiedTx[rule.criteria.field] as string || '').toLowerCase();
      
      const criterionVal = rule.criteria.field === 'amount' 
         ? parseFloat(rule.criteria.value)
         : rule.criteria.value.toLowerCase();

      switch (rule.criteria.operator) {
        case 'contains':
          isMatch = String(valToCheck).includes(String(criterionVal));
          break;
        case 'equals':
          isMatch = String(valToCheck) === String(criterionVal);
          break;
        case 'starts_with':
          isMatch = String(valToCheck).startsWith(String(criterionVal));
          break;
        case 'greater_than':
          isMatch = (valToCheck as number) > (criterionVal as number);
          break;
        case 'less_than':
          isMatch = (valToCheck as number) < (criterionVal as number);
          break;
      }

      if (isMatch) {
        if (rule.actions.renameTo) {
          modifiedTx.enhancedDescription = rule.actions.renameTo;
        }
        if (rule.actions.setCategory) {
          modifiedTx.category = rule.actions.setCategory;
        }
        if (rule.actions.addTags) {
          const currentTags = new Set(modifiedTx.tags || []);
          rule.actions.addTags.forEach(t => currentTags.add(t));
          modifiedTx.tags = Array.from(currentTags);
        }
        // If rules touched it, mark reviewed and boost confidence
        modifiedTx.isReviewed = true;
        modifiedTx.confidence = 100;
        modifiedTx.status = 'verified';
      }
    });

    return modifiedTx;
  };

  const runRulesOnAllTransactions = () => {
     setTransactions(prev => prev.map(tx => applyRulesToTransaction(tx, rules)));
  };

  // Logic to process new parsed transactions and detect duplicates
  const handleTransactionsParsed = (parsed: Partial<Transaction>[]) => {
    const newTransactions: Transaction[] = [];
    const newDuplicates: DuplicatePair[] = [];

    parsed.forEach(incoming => {
      // Basic validation
      if (!incoming.date || incoming.amount === undefined || !incoming.originalDescription) return;

      const confidence = incoming.confidence || 0;
      
      let incomingTx = {
        tags: [], // Default tags if missing
        ...incoming,
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        status: confidence >= 80 ? 'verified' : 'needs_review',
        isReviewed: false // New items are not reviewed by default
      } as Transaction;

      // Apply Rules *Immediately* on Import
      incomingTx = applyRulesToTransaction(incomingTx, rules);

      // Duplicate Detection Logic
      const potentialMatch = transactions.find(existing => {
        const amountMatch = Math.abs(existing.amount - incomingTx.amount) < 0.01;
        
        // Date check: Allow 1 day variance for timezone diffs between banks
        const d1 = new Date(existing.date);
        const d2 = new Date(incomingTx.date);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const dateMatch = diffDays <= 1;

        return amountMatch && dateMatch;
      });

      if (potentialMatch) {
        newDuplicates.push({
          id: `dup-${Date.now()}-${Math.random()}`,
          existing: potentialMatch,
          incoming: incomingTx,
          confidence: 0.9
        });
      } else {
        newTransactions.push(incomingTx);
      }
    });

    if (newTransactions.length > 0) {
      setTransactions(prev => [...prev, ...newTransactions]);
    }

    if (newDuplicates.length > 0) {
      setPotentialDuplicates(prev => [...prev, ...newDuplicates]);
      setView('duplicates'); // Auto navigate to review
    } else if (newTransactions.some(t => t.status === 'needs_review')) {
       // If there are low confidence items, also navigate to review
       setView('duplicates');
    } else {
       // If all clear, go to transactions
       setView('transactions');
    }
  };

  const handleDuplicateResolution = (id: string, action: 'keep_both' | 'discard_incoming') => {
    setPotentialDuplicates(prev => {
      const target = prev.find(p => p.id === id);
      const remaining = prev.filter(p => p.id !== id);

      if (action === 'keep_both' && target) {
        // Move incoming to valid transactions (assuming verified if user manually approves keep)
        setTransactions(currTxs => [...currTxs, { ...target.incoming, status: 'verified' }]);
      }
      
      // If discard, we just remove it from potentialDuplicates and do nothing else
      return remaining;
    });
  };
  
  const handleReviewAction = (txId: string, action: 'approve' | 'delete', updatedTx?: Transaction) => {
    if (action === 'delete') {
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } else if (action === 'approve') {
       setTransactions(prev => prev.map(t => {
         if (t.id === txId) {
            return updatedTx ? { ...updatedTx, status: 'verified', isReviewed: true } : { ...t, status: 'verified', isReviewed: true };
         }
         return t;
       }));
    }
  };

  // Bulk Actions
  const handleBulkReview = (ids: string[], isReviewed: boolean) => {
    setTransactions(prev => prev.map(t => {
      if (ids.includes(t.id)) {
        return { ...t, isReviewed };
      }
      return t;
    }));
  };

  const handleBulkDelete = (ids: string[]) => {
    setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
  };

  const handleUpdateTransaction = (updated: Transaction | Transaction[]) => {
    const updates = Array.isArray(updated) ? updated : [updated];
    if (updates.length === 0) return;
    
    setTransactions(prev => {
      const updateMap = new Map(updates.map(u => [u.id, u]));
      return prev.map(t => updateMap.get(t.id) || t);
    });
  };

  const handleAddCategory = (name: string, color: string) => {
    setCategories(prev => [...prev, { id: Date.now().toString(), name, color }]);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleRenameTag = (oldTag: string, newTag: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.tags && t.tags.includes(oldTag)) {
        return {
          ...t,
          tags: t.tags.map(tag => tag === oldTag ? newTag : tag)
        };
      }
      return t;
    }));
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.tags && t.tags.includes(tagToDelete)) {
        return {
          ...t,
          tags: t.tags.filter(tag => tag !== tagToDelete)
        };
      }
      return t;
    }));
  };
  
  // Account Operations
  const handleAddAccount = (acc: Omit<Account, 'id'>) => {
     const newAccount = { ...acc, id: `acc-${Date.now()}` };
     setAccounts(prev => [...prev, newAccount]);
  };
  
  const handleUpdateAccount = (acc: Account) => {
    setAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
    // Also update source name in transactions if account name changes
    setTransactions(prev => prev.map(t => {
       if (t.accountId === acc.id) {
         return { ...t, source: acc.name };
       }
       return t;
    }));
  };
  
  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    // Clear account links in transactions
    setTransactions(prev => prev.map(t => {
      if (t.accountId === id) {
        return { ...t, accountId: undefined, source: `${t.source} (Deleted)` };
      }
      return t;
    }));
  };

  // Rule Operations
  const handleAddRule = (rule: Rule) => {
      setRules(prev => [...prev, rule]);
  };

  const handleUpdateRule = (updatedRule: Rule) => {
      setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
  };

  const handleDeleteRule = (id: string) => {
      setRules(prev => prev.filter(r => r.id !== id));
  };

  const reviewCount = potentialDuplicates.length + transactions.filter(t => t.status === 'needs_review').length;
  const loanCount = transactions.filter(t => t.splitDetails && !t.splitDetails.isSettled).length;

  const NavItem = ({ id, icon: Icon, label, badge }: { id: ViewState, icon: any, label: string, badge?: number }) => {
    const isActive = view === id;
    return (
      <button 
        onClick={() => { setView(id); setSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden whitespace-nowrap ${
          isActive 
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/20' 
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
      >
        {/* Active Indicator Glow */}
        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />}
        
        <Icon size={20} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`} />
        <span className="font-medium text-sm tracking-wide truncate">{label}</span>
        
        {badge !== undefined && badge > 0 && (
          <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isActive ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-slate-100">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Modern Sidebar */}
      <aside className={`
        fixed md:relative z-50 w-72 h-full bg-[#0F172A] flex flex-col transition-transform duration-300 ease-out border-r border-slate-800 shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="h-24 flex items-center gap-3 px-6 border-b border-slate-800/60 bg-slate-900">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <span className="text-white font-bold text-xl">F</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-lg font-bold text-white leading-tight truncate">FinUnify</h1>
            <span className="text-[10px] font-medium text-indigo-400 uppercase tracking-widest truncate">AI Workspace</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Overview</p>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="transactions" icon={List} label="Transactions" />
          <NavItem id="lending" icon={HandCoins} label="Lending & Splits" badge={loanCount} />
          
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-2" />
          
          <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Data Operations</p>
          <NavItem id="upload" icon={UploadCloud} label="Import Data" />
          <NavItem id="duplicates" icon={AlertCircle} label="Review Center" badge={reviewCount} />
          
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent mx-2" />

          <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">System</p>
          <NavItem id="settings" icon={Settings} label="Settings" />
        </div>

        {/* User / Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900">
           <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                 <p className="text-xs font-semibold text-slate-300 tracking-wide">AI Engine Online</p>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed flex items-center gap-1.5">
                <Sparkles size={10} className="text-indigo-400" />
                Gemini 2.5 Flash
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">F</div>
             <span className="font-bold text-white text-lg">FinUnify</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {view === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                categories={categories}
                potentialDuplicatesCount={reviewCount}
                onNavigateToDuplicates={() => setView('duplicates')}
                currency={currency}
              />
            )}
            {view === 'transactions' && (
              <TransactionList 
                transactions={transactions} 
                categories={categories} 
                onUpdateTransaction={handleUpdateTransaction}
                onBulkReview={handleBulkReview}
                onBulkDelete={handleBulkDelete}
                currency={currency}
              />
            )}
            {view === 'upload' && (
              <UploadSection categories={categories} accounts={accounts} onTransactionsParsed={handleTransactionsParsed} />
            )}
            {view === 'lending' && (
              <LendingDashboard transactions={transactions} onUpdateTransaction={handleUpdateTransaction} currency={currency} />
            )}
            {view === 'duplicates' && (
              <ReviewCenter 
                duplicates={potentialDuplicates} 
                uncertainTransactions={transactions.filter(t => t.status === 'needs_review')}
                onResolveDuplicate={handleDuplicateResolution} 
                onReviewAction={handleReviewAction}
                categories={categories}
                currency={currency}
              />
            )}
            {view === 'settings' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
                   <button 
                     onClick={() => setSettingsTab('general')}
                     className={`pb-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${settingsTab === 'general' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="flex items-center gap-2">
                       <Globe size={16} />
                       General
                     </div>
                     {settingsTab === 'general' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
                   </button>
                   <button 
                     onClick={() => setSettingsTab('rules')}
                     className={`pb-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${settingsTab === 'rules' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="flex items-center gap-2">
                       <Zap size={16} />
                       Automation Rules
                     </div>
                     {settingsTab === 'rules' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
                   </button>
                   <button 
                     onClick={() => setSettingsTab('accounts')}
                     className={`pb-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${settingsTab === 'accounts' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="flex items-center gap-2">
                       <Wallet size={16} />
                       Accounts
                     </div>
                     {settingsTab === 'accounts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
                   </button>
                   <button 
                     onClick={() => setSettingsTab('categories')}
                     className={`pb-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${settingsTab === 'categories' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="flex items-center gap-2">
                       <ListFilter size={16} />
                       Categories
                     </div>
                     {settingsTab === 'categories' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
                   </button>
                   <button 
                     onClick={() => setSettingsTab('tags')}
                     className={`pb-3 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${settingsTab === 'tags' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                   >
                     <div className="flex items-center gap-2">
                       <TagIcon size={16} />
                       Tags
                     </div>
                     {settingsTab === 'tags' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />}
                   </button>
                </div>
                
                {settingsTab === 'general' && (
                   <div className="max-w-2xl mx-auto space-y-6">
                     <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white">General Settings</h2>
                        <p className="text-slate-400">Configure global application preferences.</p>
                     </div>

                     <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Localization</h3>
                        <div className="space-y-4">
                           <div className="space-y-1">
                              <label className="text-sm font-medium text-slate-400">Default Currency</label>
                              <select 
                                value={currency} 
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white cursor-pointer"
                              >
                                 <option value="USD">USD ($) - United States Dollar</option>
                                 <option value="EUR">EUR (€) - Euro</option>
                                 <option value="GBP">GBP (£) - British Pound</option>
                                 <option value="INR">INR (₹) - Indian Rupee</option>
                                 <option value="JPY">JPY (¥) - Japanese Yen</option>
                                 <option value="CAD">CAD ($) - Canadian Dollar</option>
                                 <option value="AUD">AUD ($) - Australian Dollar</option>
                              </select>
                              <p className="text-xs text-slate-500">This currency symbol will be used throughout the application.</p>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">AI Service Access</h3>
                         <div className="space-y-4">
                            <p className="text-sm text-slate-400">
                                This application uses Google Gemini models. You can update the API key used for analysis below.
                            </p>
                            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-700 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                        <Sparkles size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">Gemini API Key</h4>
                                        <p className="text-xs text-slate-500">Managed via AI Studio</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => window.aistudio?.openSelectKey()}
                                    className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                                >
                                    Update Key
                                </button>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <p>You must select an API key from a paid GCP project to ensure full functionality.</p>
                            </div>
                         </div>
                     </div>
                   </div>
                )}
                {settingsTab === 'accounts' && (
                  <AccountManager 
                    accounts={accounts}
                    onAddAccount={handleAddAccount}
                    onUpdateAccount={handleUpdateAccount}
                    onDeleteAccount={handleDeleteAccount}
                  />
                )}
                {settingsTab === 'categories' && (
                  <CategoryManager 
                    categories={categories} 
                    onAddCategory={handleAddCategory} 
                    onDeleteCategory={handleDeleteCategory} 
                  />
                )}
                {settingsTab === 'tags' && (
                  <TagManager 
                    transactions={transactions}
                    onRenameTag={handleRenameTag}
                    onDeleteTag={handleDeleteTag}
                  />
                )}
                {settingsTab === 'rules' && (
                  <RuleManager 
                    rules={rules}
                    categories={categories}
                    transactionsCount={transactions.length}
                    onAddRule={handleAddRule}
                    onUpdateRule={handleUpdateRule}
                    onDeleteRule={handleDeleteRule}
                    onRunRules={runRulesOnAllTransactions}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}