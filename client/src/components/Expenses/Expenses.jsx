import { useState, useEffect } from 'react'
import { Plus, Trash2, Receipt, ArrowRight, CheckCircle2, Image as ImageIcon, X } from 'lucide-react'
import { api } from '../../services/api.js'

export default function Expenses({ tripId, members }) {
  const [expenses, setExpenses] = useState([])
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading] = useState(false)

  // Form states
  const [showAddModal, setShowAddModal] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState(members[0]?.id || '')
  const [splitWithIds, setSplitWithIds] = useState(members.map((m) => m.id))
  const [receiptImage, setReceiptImage] = useState(null)
  const [viewReceipt, setViewReceipt] = useState(null)

  // Load from PostgreSQL
  useEffect(() => {
    if (tripId) {
      loadData()
    }
  }, [tripId])

  useEffect(() => {
    if (members.length > 0 && !paidById) {
      setPaidById(members[0].id)
      setSplitWithIds(members.map((m) => m.id))
    }
  }, [members])

  const loadData = async () => {
    setLoading(true)
    try {
      const [expData, stData] = await Promise.all([
        api.getExpenses(tripId),
        api.getSettlements(tripId),
      ])
      setExpenses(expData)
      setSettlements(stData)
    } catch (err) {
      console.error('Failed to load expenses from PostgreSQL:', err)
    } finally {
      setLoading(false)
    }
  }

  // 1. Handle Bill Upload (file input to base64 preview)
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptImage(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // 2. Toggle member checkbox for split
  const handleToggleSplitMember = (memberId) => {
    if (splitWithIds.includes(memberId)) {
      if (splitWithIds.length === 1) return // at least 1 person must split
      setSplitWithIds(splitWithIds.filter((id) => id !== memberId))
    } else {
      setSplitWithIds([...splitWithIds, memberId])
    }
  }

  // 3. Add Expense to PostgreSQL
  const handleAddExpense = async (e) => {
    e.preventDefault()
    if (!title.trim() || !amount || splitWithIds.length === 0) return

    const newExpense = {
      title: title.trim(),
      amount: parseFloat(amount),
      paidById,
      splitWithIds,
      receiptImage,
    }

    try {
      const saved = await api.addExpense(tripId, newExpense)
      setExpenses([saved, ...expenses])
      setTitle('')
      setAmount('')
      setReceiptImage(null)
      setShowAddModal(false)
    } catch (err) {
      alert('Error saving expense to PostgreSQL')
    }
  }

  // 4. Delete Expense from PostgreSQL
  const handleDeleteExpense = async (id) => {
    try {
      await api.deleteExpense(tripId, id)
      setExpenses(expenses.filter((exp) => exp.id !== id))
    } catch (err) {
      alert('Error deleting expense')
    }
  }

  // 5. Handle Settlement ("Settle Up" button)
  const handleSettleUp = async (fromId, toId, settleAmount) => {
    try {
      const saved = await api.addSettlement(tripId, {
        fromId,
        toId,
        amount: settleAmount,
      })
      setSettlements([...settlements, saved])
    } catch (err) {
      alert('Error recording settlement')
    }
  }

  // -------------------------------------------------------------
  // CALCULATION ENGINE: "Calculate Who Owes Who"
  // -------------------------------------------------------------
  const balances = {}
  members.forEach((m) => {
    balances[m.id] = 0
  })

  // Add what each person paid and subtract their split share
  expenses.forEach((exp) => {
    const splitCount = exp.splitWithIds.length || 1
    const splitAmount = exp.amount / splitCount

    balances[exp.paidById] = (balances[exp.paidById] || 0) + exp.amount

    exp.splitWithIds.forEach((mId) => {
      balances[mId] = (balances[mId] || 0) - splitAmount
    })
  })

  // Apply settlements already made
  settlements.forEach((st) => {
    balances[st.fromId] = (balances[st.fromId] || 0) + st.amount
    balances[st.toId] = (balances[st.toId] || 0) - st.amount
  })

  // Calculate pairwise debts (Greedy Simplification)
  const debts = []
  const debtors = []
  const creditors = []

  Object.keys(balances).forEach((mId) => {
    const bal = Math.round(balances[mId] * 100) / 100
    if (bal < -0.01) {
      debtors.push({ id: mId, amount: -bal })
    } else if (bal > 0.01) {
      creditors.push({ id: mId, amount: bal })
    }
  })

  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const settleAmt = Math.min(debtor.amount, creditor.amount)

    debts.push({
      fromId: debtor.id,
      toId: creditor.id,
      amount: settleAmt.toFixed(2),
    })

    debtor.amount -= settleAmt
    creditor.amount -= settleAmt

    if (debtor.amount <= 0.01) i++
    if (creditor.amount <= 0.01) j++
  }

  const getMemberName = (id) => members.find((m) => m.id === id)?.name || 'Unknown'
  const totalTripCost = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <div className="space-y-6">
      {/* 1. Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Trip Spending</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{totalTripCost.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Expenses Logged</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{expenses.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Settlements</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{debts.length}</p>
        </div>
      </div>

      {/* 2. "Who Owes Who" & Settlement Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
          ⚖️ Who Owes Who (Settlement Summary)
        </h3>

        {debts.length === 0 ? (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm font-medium">
            <CheckCircle2 size={18} />
            All settled up! No one owes anything right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {debts.map((debt, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="text-slate-800 font-semibold">{getMemberName(debt.fromId)}</span>
                  <ArrowRight size={14} className="text-slate-400" />
                  <span className="text-slate-800 font-semibold">{getMemberName(debt.toId)}</span>
                  <span className="text-indigo-600 font-bold ml-1">₹{debt.amount}</span>
                </div>

                <button
                  onClick={() => handleSettleUp(debt.fromId, debt.toId, parseFloat(debt.amount))}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition"
                >
                  Settle Up
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Expense List Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-lg">Expense History</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* 4. Expenses List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400">
          No expenses added yet. Click <strong>"Add Expense"</strong> to log dinners, cabs, or hotel bills!
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{exp.title}</span>
                    {exp.receiptImage && (
                      <button
                        onClick={() => setViewReceipt(exp.receiptImage)}
                        className="text-xs flex items-center gap-1 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-600 border"
                      >
                        <ImageIcon size={12} /> View Bill
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paid by <strong className="text-slate-700">{getMemberName(exp.paidById)}</strong> • Split between {exp.splitWithIds.length} people
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-slate-800">₹{exp.amount.toFixed(2)}</span>
                <button
                  onClick={() => handleDeleteExpense(exp.id)}
                  className="text-slate-400 hover:text-red-500 transition p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Add New Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Expense Name</label>
                <input
                  type="text"
                  placeholder="e.g. Seafood Dinner, Beach Resort, Cab"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="₹0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Paid By</label>
                  <select
                    value={paidById}
                    onChange={(e) => setPaidById(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split with checkboxes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Split With:</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={splitWithIds.includes(m.id)}
                        onChange={() => handleToggleSplitMember(m.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Upload Bill */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Upload Bill / Receipt (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                />
                {receiptImage && <p className="text-xs text-emerald-600 mt-1">✓ Receipt attached</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. View Receipt Modal */}
      {viewReceipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 relative shadow-2xl">
            <button
              onClick={() => setViewReceipt(null)}
              className="absolute top-3 right-3 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 text-slate-600"
            >
              <X size={18} />
            </button>
            <h4 className="font-bold text-slate-800 mb-3">Bill Receipt</h4>
            <img src={viewReceipt} alt="Bill Receipt" className="max-h-[70vh] w-auto mx-auto rounded-lg object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
