import React, { useMemo, useState } from 'react';
import { Transaction, SplitItem, Payment } from '../types';
import { Users, CheckCircle, Clock, Banknote, ChevronDown, ChevronUp, X, ArrowUpRight, DollarSign, History, AlertCircle } from 'lucide-react';

interface LendingDashboardProps {
  transactions: Transaction[];
  onUpdateTransaction: (transaction: Transaction | Transaction[]) => void;
  currency: string;
}

export const LendingDashboard: React.FC<LendingDashboardProps> = ({ transactions, onUpdateTransaction, currency }) => {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(Math.abs(amount));
  };

  // Filter only transactions with split details
  const loans = useMemo(() => {
    return transactions.filter(t => t.splitDetails && t.splitDetails.items.length > 0).sort((a, b) => {
        // Sort by date
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions]);

  const stats = useMemo(() => {
    let totalOwed = 0;
    let totalSettled = 0;
    const byPerson: Record<string, number> = {};

    loans.forEach(loan => {
       if (!loan.splitDetails) return;
       
       loan.splitDetails.items.forEach(item => {
          const paid = item.paidAmount || 0;
          const owed = item.amount - paid; // Can be negative if overpaid (credit)
          
          totalOwed += owed;
          totalSettled += paid;
          byPerson[item.name] = (byPerson[item.name] || 0) + owed;
       });
    });

    return { totalOwed, totalSettled, byPerson };
  }, [loans]);

  const sortedDebtors = useMemo(() => {
    return Object.entries(stats.byPerson).sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [stats.byPerson]);

  const personHistory = useMemo(() => {
    if (!selectedPerson) return [];
    return transactions
        .filter(t => t.splitDetails?.items.some(i => i.name === selectedPerson))
        .map(t => {
             const item = t.splitDetails!.items.find(i => i.name === selectedPerson)!;
             return { tx: t, item };
        })
        .sort((a, b) => new Date(b.tx.date).getTime() - new Date(a.tx.date).getTime());
  }, [transactions, selectedPerson]);

  const paymentHistory = useMemo(() => {
      if (!selectedPerson) return [];
      const payments: { payment: Payment, txDescription: string }[] = [];
      personHistory.forEach(({ tx, item }) => {
          if (item.payments) {
              item.payments.forEach(p => {
                  payments.push({
                      payment: p,
                      txDescription: tx.enhancedDescription
                  });
              });
          }
      });
      return payments.sort((a, b) => new Date(b.payment.date).getTime() - new Date(a.payment.date).getTime());
  }, [personHistory, selectedPerson]);

  const totalOutstandingForPerson = useMemo(() => {
     return personHistory.reduce((acc, { item }) => {
        return acc + (item.amount - (item.paidAmount || 0));
     }, 0);
  }, [personHistory]);

  const handleSettleItem = (tx: Transaction, itemId: string) => {
    if (!tx.splitDetails) return;
    
    const updatedItems = tx.splitDetails.items.map(item => {
        if (item.id === itemId) {
            const isSettling = !item.isSettled;
            // If settling, pay the full amount (or cap at amount if we want to reset overpayment, but simpler to just set to amount)
            // If un-settling, reset paid to 0.
            const newPaidAmount = isSettling ? item.amount : 0;
            const payments = item.payments ? [...item.payments] : [];

            if (isSettling) {
                const amountPaid = item.amount - (item.paidAmount || 0);
                if (amountPaid > 0) {
                    payments.push({
                        id: Date.now().toString(),
                        date: new Date().toISOString(),
                        amount: amountPaid
                    });
                }
            } else {
                payments.length = 0; 
            }

            return {
                ...item,
                isSettled: isSettling,
                paidAmount: newPaidAmount,
                dateSettled: isSettling ? new Date().toISOString().split('T')[0] : undefined,
                payments: payments
            };
        }
        return item;
    });

    onUpdateTransaction({
        ...tx,
        splitDetails: {
            ...tx.splitDetails,
            items: updatedItems
        }
    });
  };

  const handleBulkSettle = () => {
      const amountToPay = parseFloat(settleAmount);
      if (isNaN(amountToPay) || amountToPay <= 0) return;

      let remaining = amountToPay;
      const updatesMap = new Map<string, Transaction>();

      // Get all items (unsettled first, then settled, oldest to newest) to apply payments
      // We want to pay off oldest debts first.
      const relevantHistory = [...personHistory].reverse();

      for (const { tx, item } of relevantHistory) {
          // If we have no money left, stop, UNLESS this is the very last transaction and we have remaining money (overpayment)
          // Actually, we iterate through all to pay off debt. If we reach the end and still have `remaining`, we dump it on the latest tx.
          if (remaining <= 0.009) break;

          const itemAmount = item.amount;
          const alreadyPaid = item.paidAmount || 0;
          const currentOwed = Math.max(0, itemAmount - alreadyPaid); // Only pay what's owed initially

          let payThisTx = 0;
          
          if (currentOwed > 0) {
             payThisTx = Math.min(remaining, currentOwed);
          }

          // If this is the MOST RECENT transaction (first in personHistory, last in relevantHistory)
          // AND we have paid off everything else, dump the remainder here.
          const isMostRecent = tx.id === personHistory[0].tx.id;
          if (isMostRecent && remaining > payThisTx) {
              payThisTx = remaining; // Pay everything, causing overpayment
          }

          if (payThisTx > 0) {
             const newPaidAmount = alreadyPaid + payThisTx;
             const isFullyPaid = newPaidAmount >= itemAmount - 0.01;

             // Check if we already modified this tx in this loop
             let txToUpdate = updatesMap.get(tx.id);
             if (!txToUpdate) {
                txToUpdate = { ...tx, splitDetails: { ...tx.splitDetails!, items: [...tx.splitDetails!.items] } };
             }
             
             const itemIndex = txToUpdate.splitDetails!.items.findIndex(i => i.id === item.id);
             if (itemIndex !== -1) {
                 const currentItem = txToUpdate.splitDetails!.items[itemIndex];
                 const currentPayments = currentItem.payments ? [...currentItem.payments] : [];
                 
                 currentPayments.push({
                     id: `pay-${Date.now()}-${Math.random()}`,
                     date: new Date().toISOString(),
                     amount: payThisTx
                 });

                 txToUpdate.splitDetails!.items[itemIndex] = {
                     ...currentItem,
                     paidAmount: newPaidAmount,
                     isSettled: isFullyPaid,
                     dateSettled: isFullyPaid && !currentItem.dateSettled ? new Date().toISOString().split('T')[0] : currentItem.dateSettled,
                     payments: currentPayments
                 };
             }

             updatesMap.set(tx.id, txToUpdate);
             remaining -= payThisTx;
          }
      }

      onUpdateTransaction(Array.from(updatesMap.values()));
      setSettleAmount('');
  };

  const toggleExpand = (id: string) => {
      setExpandedTxId(expandedTxId === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-white">Lending & Splits</h2>
           <p className="text-slate-400">Track money owed to you from friends and splits.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <Banknote size={20} />
                </div>
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Total Owed To You</span>
            </div>
            <p className="text-3xl font-bold text-white">
                {formatCurrency(stats.totalOwed)}
            </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <CheckCircle size={20} />
                </div>
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Total Settled</span>
            </div>
            <p className="text-3xl font-bold text-white">
                {formatCurrency(stats.totalSettled)}
            </p>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Users size={20} />
                </div>
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wide">Top Borrower</span>
            </div>
            {sortedDebtors.length > 0 ? (
                <div>
                    <p className="text-xl font-bold text-white">
                        {sortedDebtors[0][0]}
                    </p>
                    <p className="text-sm text-slate-500">
                        Balance: {sortedDebtors[0][1] < 0 ? '+' : ''}{formatCurrency(sortedDebtors[0][1] * -1)}
                        {sortedDebtors[0][1] < 0 ? ' (Credit)' : ' (Owed)'}
                    </p>
                </div>
            ) : (
                <p className="text-slate-500 text-sm">No active debts</p>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* People List */}
          <div className="lg:col-span-1 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden h-fit">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                  <h3 className="font-semibold text-white">People</h3>
              </div>
              <div className="divide-y divide-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {sortedDebtors.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">No records found.</div>
                  ) : (
                      sortedDebtors
                        .map(([person, amount]) => (
                          <div 
                            key={person} 
                            onClick={() => setSelectedPerson(person)}
                            className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors cursor-pointer group"
                          >
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs group-hover:bg-indigo-500/30 transition-colors">
                                      {person.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-300 group-hover:text-white transition-colors">{person}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${amount <= 0 ? 'text-emerald-400' : 'text-white'}`}>
                                    {amount <= 0 && '+'}{formatCurrency(amount * (amount < 0 ? -1 : 1))}
                                </span>
                                <ChevronDown size={14} className="text-slate-500 -rotate-90 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
             <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                  <h3 className="font-semibold text-white">Loan History</h3>
              </div>
              
              <div className="divide-y divide-slate-800">
                  {loans.length === 0 ? (
                      <div className="p-12 text-center text-slate-500">
                          <Banknote size={32} className="mx-auto mb-3 opacity-20" />
                          <p>No lending transactions recorded yet.</p>
                          <p className="text-sm mt-1">Go to the Transactions tab and click "Lend" on any item.</p>
                      </div>
                  ) : (
                      loans.map(loan => {
                          const items = loan.splitDetails?.items || [];
                          const settledCount = items.filter(i => i.isSettled).length;
                          const isFullySettled = settledCount === items.length;
                          const summaryText = items.length === 1 
                             ? items[0].name 
                             : `${items.length} People`;

                          return (
                            <div key={loan.id} className={`group hover:bg-slate-800/50 transition-colors ${isFullySettled ? 'bg-slate-900/30 opacity-75' : ''}`}>
                                <div 
                                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                                    onClick={() => toggleExpand(loan.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`font-semibold ${isFullySettled ? 'text-slate-500' : 'text-slate-200'}`}>{summaryText}</span>
                                            {isFullySettled ? (
                                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase rounded-full border border-emerald-500/20">All Settled</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase rounded-full border border-amber-500/20">
                                                    {settledCount > 0 ? `${items.length - settledCount} Pending` : 'Owes You'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-400">{loan.enhancedDescription}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <span>{loan.date}</span>
                                            <span>•</span>
                                            <span>Total Bill: {formatCurrency(loan.amount)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                        <div className="text-right">
                                            <p className={`font-bold text-lg ${isFullySettled ? 'text-slate-500' : 'text-slate-200'}`}>
                                                {formatCurrency(loan.splitDetails?.totalLent || 0)}
                                            </p>
                                            <p className="text-xs text-slate-500">Total Lent</p>
                                        </div>
                                        <div className="text-slate-500">
                                            {expandedTxId === loan.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {expandedTxId === loan.id && (
                                    <div className="bg-slate-950/50 border-t border-slate-800 px-4 py-2 space-y-2">
                                        {items.map(item => {
                                            const paid = item.paidAmount || 0;
                                            const owed = item.amount - paid;
                                            const isOverpaid = owed < -0.01;
                                            return (
                                            <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${item.isSettled ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-medium block ${item.isSettled ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                            {item.name}
                                                        </span>
                                                        {paid > 0 && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-emerald-500 font-medium">
                                                                    Paid {formatCurrency(paid)}
                                                                </span>
                                                                {isOverpaid && (
                                                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 rounded font-bold">
                                                                        CR {formatCurrency(Math.abs(owed))}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-sm font-bold ${item.isSettled ? 'text-slate-500' : 'text-slate-200'}`}>
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleSettleItem(loan, item.id); }}
                                                        className={`p-1.5 rounded-lg border transition-all ${
                                                            item.isSettled 
                                                            ? 'bg-transparent border-slate-700 text-slate-600 hover:text-indigo-400' 
                                                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                                                        }`}
                                                        title={item.isSettled ? "Mark Unpaid" : "Mark Settled"}
                                                    >
                                                        {item.isSettled ? <Clock size={16} /> : <CheckCircle size={16} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>
                          );
                      })
                  )}
              </div>
          </div>
      </div>

      {/* Person History Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-800 flex flex-col max-h-[85vh]">
             {/* Header */}
             <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg">
                        {selectedPerson.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">{selectedPerson}</h3>
                        <p className="text-xs text-slate-400">Transaction History</p>
                    </div>
                </div>
                <button 
                  onClick={() => setSelectedPerson(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
             </div>
             
             {/* Content */}
             <div className="overflow-y-auto p-0 divide-y divide-slate-800">
                {/* Pending Bills Section (Includes overpaid "credit" bills) */}
                {personHistory.some(h => !h.item.isSettled || (h.item.paidAmount || 0) > h.item.amount) && (
                  <div className="bg-slate-900/50">
                    <div className="px-4 py-2 bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                        Active Balances
                    </div>
                    {personHistory.filter(h => !h.item.isSettled || (h.item.paidAmount || 0) > h.item.amount).map(({ tx, item }) => {
                        const paid = item.paidAmount || 0;
                        const owed = item.amount - paid;
                        const isOverpaid = owed < -0.01;
                        return (
                        <div key={tx.id + item.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-200">
                                        {tx.enhancedDescription}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500">{tx.date}</span>
                                        <span className="text-xs text-slate-600">•</span>
                                        <span className="text-xs text-slate-500">Bill: {formatCurrency(tx.amount)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${isOverpaid ? 'text-emerald-400' : 'text-white'}`}>
                                        {isOverpaid && '+'}{formatCurrency(Math.abs(owed))}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">
                                        {isOverpaid ? 'Credit' : 'Owes'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 capitalize">
                                        {tx.category}
                                    </span>
                                    {paid > 0 && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            Paid {formatCurrency(paid)}
                                        </span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleSettleItem(tx, item.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                                >
                                    <CheckCircle size={12} /> Mark as Settled
                                </button>
                            </div>
                        </div>
                    )})}
                  </div>
                )}

                {/* Payment History Section */}
                <div className="border-t border-slate-800">
                    <div className="px-4 py-2 bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                        Payment Record
                    </div>
                    {paymentHistory.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm italic">No payments recorded yet.</div>
                    ) : (
                        paymentHistory.map((rec, i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors border-b border-slate-800 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-500">
                                        <ArrowUpRight size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-300">Payment Received</p>
                                        <p className="text-xs text-slate-500">For: {rec.txDescription}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-400">
                                        +{formatCurrency(rec.payment.amount)}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(rec.payment.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {/* Fully Settled Items (History) */}
                <div className="border-t border-slate-800">
                   <div className="px-4 py-2 bg-slate-950/50 text-xs font-semibold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                        Past Settled Bills
                    </div>
                    {personHistory.filter(h => h.item.isSettled && (h.item.paidAmount || 0) <= h.item.amount).length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm italic">No settled bills.</div>
                    ) : (
                        personHistory.filter(h => h.item.isSettled && (h.item.paidAmount || 0) <= h.item.amount).map(({ tx, item }) => (
                            <div key={tx.id + item.id} className="p-4 hover:bg-slate-800/50 transition-colors opacity-60">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-sm text-slate-400 line-through">
                                            {tx.enhancedDescription}
                                        </h4>
                                        <div className="text-xs text-slate-500 mt-1">{tx.date}</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-500">
                                            {formatCurrency(item.amount)}
                                        </p>
                                        <p className="text-[10px] uppercase font-bold text-slate-600 mt-0.5">Settled</p>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => handleSettleItem(tx, item.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-800 text-slate-400 hover:text-white"
                                    >
                                        <Clock size={12} /> Mark as Unpaid
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>

             {/* Footer Summary & Settle */}
             <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                 <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-400 font-medium">Net Balance</span>
                     <span className={`font-bold text-lg ${totalOutstandingForPerson <= 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {totalOutstandingForPerson <= 0 ? '+' : ''}{formatCurrency(totalOutstandingForPerson * (totalOutstandingForPerson < 0 ? -1 : 1))}
                        {totalOutstandingForPerson < 0 && ' (Credit)'}
                     </span>
                 </div>
                 
                 {/* Only show settle up if they OWE money */}
                 {totalOutstandingForPerson > 0.01 && (
                     <div className="flex gap-2">
                         <div className="relative flex-1">
                             <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                             <input 
                               type="number" 
                               min="0"
                               step="0.01"
                               placeholder="Enter amount to settle..."
                               className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                               value={settleAmount}
                               onChange={(e) => setSettleAmount(e.target.value)}
                             />
                         </div>
                         <button 
                            onClick={handleBulkSettle}
                            disabled={!settleAmount || parseFloat(settleAmount) <= 0}
                            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-900/50"
                         >
                            Settle Up
                         </button>
                     </div>
                 )}
                 {totalOutstandingForPerson <= 0.01 && (
                     <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-emerald-400 text-sm font-medium">
                        All caught up! {totalOutstandingForPerson < -0.01 && 'They have credit.'}
                     </div>
                 )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};