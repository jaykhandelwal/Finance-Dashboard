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
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Lending & Splits</h2>
           <p className="text-slate-500 font-medium">Track money owed to you from friends and splits.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-100/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
                    <Banknote size={24} />
                </div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Owed To You</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">
                {formatCurrency(stats.totalOwed)}
            </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:shadow-emerald-100/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm">
                    <CheckCircle size={24} />
                </div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Total Settled</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-800">
                {formatCurrency(stats.totalSettled)}
            </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col justify-between hover:shadow-xl hover:shadow-amber-100/50 transition-all">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-sm">
                    <Users size={24} />
                </div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Top Borrower</span>
            </div>
            {sortedDebtors.length > 0 ? (
                <div>
                    <p className="text-xl font-bold text-slate-800">
                        {sortedDebtors[0][0]}
                    </p>
                    <p className="text-sm text-slate-500 font-medium">
                        Balance: {sortedDebtors[0][1] < 0 ? '+' : ''}{formatCurrency(sortedDebtors[0][1] * -1)}
                        {sortedDebtors[0][1] < 0 ? ' (Credit)' : ' (Owed)'}
                    </p>
                </div>
            ) : (
                <p className="text-slate-400 text-sm font-medium">No active debts</p>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* People List */}
          <div className="lg:col-span-1 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden h-fit">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 text-lg">People</h3>
              </div>
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {sortedDebtors.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm font-medium">No records found.</div>
                  ) : (
                      sortedDebtors
                        .map(([person, amount]) => (
                          <div 
                            key={person} 
                            onClick={() => setSelectedPerson(person)}
                            className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-100 transition-colors shadow-sm">
                                      {person.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors text-lg">{person}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-bold text-sm ${amount <= 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {amount <= 0 && '+'}{formatCurrency(amount * (amount < 0 ? -1 : 1))}
                                </span>
                                <ChevronDown size={16} className="text-slate-300 -rotate-90 opacity-0 group-hover:opacity-100 transition-all" />
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden">
             <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 text-lg">Loan History</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                  {loans.length === 0 ? (
                      <div className="p-16 text-center text-slate-400">
                          <Banknote size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="font-medium text-lg">No lending transactions recorded yet.</p>
                          <p className="text-sm mt-2 text-slate-500">Go to the Transactions tab and click "Lend" on any item.</p>
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
                            <div key={loan.id} className={`group hover:bg-slate-50 transition-colors ${isFullySettled ? 'bg-slate-50/50' : ''}`}>
                                <div 
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                                    onClick={() => toggleExpand(loan.id)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={`font-bold text-lg ${isFullySettled ? 'text-slate-400' : 'text-slate-800'}`}>{summaryText}</span>
                                            {isFullySettled ? (
                                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase rounded-full border border-emerald-100">All Settled</span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-extrabold uppercase rounded-full border border-amber-100">
                                                    {settledCount > 0 ? `${items.length - settledCount} Pending` : 'Owes You'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 font-medium">{loan.enhancedDescription}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-bold">
                                            <span>{loan.date}</span>
                                            <span>•</span>
                                            <span>Total Bill: {formatCurrency(loan.amount)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-6">
                                        <div className="text-right">
                                            <p className={`font-extrabold text-xl ${isFullySettled ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {formatCurrency(loan.splitDetails?.totalLent || 0)}
                                            </p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Total Lent</p>
                                        </div>
                                        <div className="text-slate-300">
                                            {expandedTxId === loan.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </div>
                                    </div>
                                </div>

                                {expandedTxId === loan.id && (
                                    <div className="bg-slate-50 border-t border-slate-100 px-5 py-3 space-y-2">
                                        {items.map(item => {
                                            const paid = item.paidAmount || 0;
                                            const owed = item.amount - paid;
                                            const isOverpaid = owed < -0.01;
                                            return (
                                            <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-200/50 last:border-0">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${item.isSettled ? 'bg-slate-200 text-slate-500' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className={`text-sm font-bold block ${item.isSettled ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                                            {item.name}
                                                        </span>
                                                        {paid > 0 && (
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] text-emerald-600 font-bold">
                                                                    Paid {formatCurrency(paid)}
                                                                </span>
                                                                {isOverpaid && (
                                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded font-bold">
                                                                        CR {formatCurrency(Math.abs(owed))}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-5">
                                                    <span className={`text-sm font-bold ${item.isSettled ? 'text-slate-400' : 'text-slate-800'}`}>
                                                        {formatCurrency(item.amount)}
                                                    </span>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleSettleItem(loan, item.id); }}
                                                        className={`p-2 rounded-lg border transition-all ${
                                                            item.isSettled 
                                                            ? 'bg-transparent border-slate-300 text-slate-400 hover:text-indigo-600' 
                                                            : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 shadow-sm'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
             {/* Header */}
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100 shadow-sm">
                        {selectedPerson.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">{selectedPerson}</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Transaction History</p>
                    </div>
                </div>
                <button 
                  onClick={() => setSelectedPerson(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
             </div>
             
             {/* Content */}
             <div className="overflow-y-auto p-0 divide-y divide-slate-100">
                {/* Pending Bills Section (Includes overpaid "credit" bills) */}
                {personHistory.some(h => !h.item.isSettled || (h.item.paidAmount || 0) > h.item.amount) && (
                  <div className="bg-slate-50/50">
                    <div className="px-6 py-3 bg-slate-100/80 text-xs font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200 backdrop-blur-sm">
                        Active Balances
                    </div>
                    {personHistory.filter(h => !h.item.isSettled || (h.item.paidAmount || 0) > h.item.amount).map(({ tx, item }) => {
                        const paid = item.paidAmount || 0;
                        const owed = item.amount - paid;
                        const isOverpaid = owed < -0.01;
                        return (
                        <div key={tx.id + item.id} className="p-6 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800">
                                        {tx.enhancedDescription}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500 font-medium">{tx.date}</span>
                                        <span className="text-xs text-slate-300">•</span>
                                        <span className="text-xs text-slate-500 font-medium">Bill: {formatCurrency(tx.amount)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-extrabold text-lg ${isOverpaid ? 'text-emerald-600' : 'text-slate-800'}`}>
                                        {isOverpaid && '+'}{formatCurrency(Math.abs(owed))}
                                    </p>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                                        {isOverpaid ? 'Credit' : 'Owes'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2.5 py-1 rounded-md bg-white text-slate-600 border border-slate-200 capitalize font-bold shadow-sm">
                                        {tx.category}
                                    </span>
                                    {paid > 0 && (
                                        <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold">
                                            Paid {formatCurrency(paid)}
                                        </span>
                                    )}
                                </div>
                                <button 
                                    onClick={() => handleSettleItem(tx, item.id)}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 shadow-sm"
                                >
                                    <CheckCircle size={14} /> Mark as Settled
                                </button>
                            </div>
                        </div>
                    )})}
                  </div>
                )}

                {/* Payment History Section */}
                <div className="border-t border-slate-100">
                    <div className="px-6 py-3 bg-slate-100/80 text-xs font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200 backdrop-blur-sm">
                        Payment Record
                    </div>
                    {paymentHistory.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm font-medium italic">No payments recorded yet.</div>
                    ) : (
                        paymentHistory.map((rec, i) => (
                            <div key={i} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-100 shadow-sm">
                                        <ArrowUpRight size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">Payment Received</p>
                                        <p className="text-xs text-slate-500 font-medium">For: {rec.txDescription}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-600">
                                        +{formatCurrency(rec.payment.amount)}
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium">
                                        {new Date(rec.payment.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                {/* Fully Settled Items (History) */}
                <div className="border-t border-slate-100">
                   <div className="px-6 py-3 bg-slate-100/80 text-xs font-extrabold text-slate-500 uppercase tracking-wider sticky top-0 border-b border-slate-200 backdrop-blur-sm">
                        Past Settled Bills
                    </div>
                    {personHistory.filter(h => h.item.isSettled && (h.item.paidAmount || 0) <= h.item.amount).length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm font-medium italic">No settled bills.</div>
                    ) : (
                        personHistory.filter(h => h.item.isSettled && (h.item.paidAmount || 0) <= h.item.amount).map(({ tx, item }) => (
                            <div key={tx.id + item.id} className="p-5 hover:bg-slate-50 transition-colors opacity-70 hover:opacity-100">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h4 className="font-semibold text-sm text-slate-500 line-through decoration-slate-300">
                                            {tx.enhancedDescription}
                                        </h4>
                                        <div className="text-xs text-slate-400 font-medium mt-1">{tx.date}</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-slate-600">
                                            {formatCurrency(item.amount)}
                                        </p>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Settled</p>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => handleSettleItem(tx, item.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
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
             <div className="p-6 bg-white border-t border-slate-100 shrink-0 space-y-4 shadow-[0_-8px_20px_-5px_rgba(0,0,0,0.05)] z-10">
                 <div className="flex justify-between items-center text-sm">
                     <span className="text-slate-500 font-bold uppercase tracking-wide text-xs">Net Balance</span>
                     <span className={`font-extrabold text-xl ${totalOutstandingForPerson <= 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {totalOutstandingForPerson <= 0 ? '+' : ''}{formatCurrency(totalOutstandingForPerson * (totalOutstandingForPerson < 0 ? -1 : 1))}
                        {totalOutstandingForPerson < 0 && <span className="text-xs font-bold uppercase ml-2 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Credit</span>}
                     </span>
                 </div>
                 
                 {/* Only show settle up if they OWE money */}
                 {totalOutstandingForPerson > 0.01 && (
                     <div className="flex gap-3">
                         <div className="relative flex-1">
                             <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                             <input 
                               type="number" 
                               min="0"
                               step="0.01"
                               placeholder="Enter amount to settle..."
                               className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-bold"
                               value={settleAmount}
                               onChange={(e) => setSettleAmount(e.target.value)}
                             />
                         </div>
                         <button 
                            onClick={handleBulkSettle}
                            disabled={!settleAmount || parseFloat(settleAmount) <= 0}
                            className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5"
                         >
                            Settle Up
                         </button>
                     </div>
                 )}
                 {totalOutstandingForPerson <= 0.01 && (
                     <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-emerald-600 text-sm font-bold shadow-sm">
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
