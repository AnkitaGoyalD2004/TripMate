import { useState, useEffect } from 'react'
import {
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Save,
  X,
  IndianRupee,
  Users,
  Compass,
} from 'lucide-react'
import { api } from '../../services/api.js'

export default function Analytics({ trip, onBudgetUpdate }) {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  // Budget editing
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(trip.budget || 0)
  const [savingBudget, setSavingBudget] = useState(false)

  useEffect(() => {
    if (trip?.id) {
      loadExpenses()
      setBudgetInput(trip.budget || 0)
    }
  }, [trip])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const data = await api.getExpenses(trip.id)
      setExpenses(data)
    } catch (err) {
      console.error('Failed to load expenses for analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveBudget = async (e) => {
    e.preventDefault()
    setSavingBudget(true)
    try {
      const parsed = parseFloat(budgetInput) || 0
      await api.updateBudget(trip.id, parsed)
      onBudgetUpdate(parsed)
      setIsEditingBudget(false)
    } catch (err) {
      alert('Error updating budget')
    } finally {
      setSavingBudget(false)
    }
  }

  // --- CALCULATIONS ---
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const budget = parseFloat(trip.budget || 0)
  const remaining = budget > 0 ? budget - totalSpent : 0
  const isOverBudget = budget > 0 && totalSpent > budget
  const percentSpent = budget > 0 ? Math.min(Math.round((totalSpent / budget) * 100), 100) : 0

  // Category breakdown
  const categories = [
    { key: 'Food', label: 'Food & Dining', icon: '🍽️', color: 'bg-emerald-500' },
    { key: 'Stay', label: 'Stay & Accommodation', icon: '🏨', color: 'bg-amber-500' },
    { key: 'Travel', label: 'Travel & Transport', icon: '🚕', color: 'bg-blue-500' },
    { key: 'Activity', label: 'Activities & Sightseeing', icon: '🎯', color: 'bg-purple-500' },
    { key: 'Shopping', label: 'Shopping & Souvenirs', icon: '🛍️', color: 'bg-pink-500' },
  ]

  const categoryTotals = {}
  categories.forEach((c) => {
    categoryTotals[c.key] = 0
  })

  expenses.forEach((e) => {
    const cat = e.category || 'Food'
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount
  })

  // Member spending breakdown
  const memberTotals = {}
  trip.members?.forEach((m) => {
    memberTotals[m.id] = 0
  })

  expenses.forEach((e) => {
    memberTotals[e.paidById] = (memberTotals[e.paidById] || 0) + e.amount
  })

  const getMemberName = (id) => trip.members?.find((m) => m.id === id)?.name || 'Unknown'
  const memberCount = trip.members?.length || 1
  const avgPerPerson = totalSpent / memberCount

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading trip analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* 1. Budget Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Trip Budget Status
            </span>
            <div className="flex items-center gap-3 mt-1">
              <h2 className="text-3xl font-extrabold text-slate-800">
                ₹{totalSpent.toFixed(2)}
              </h2>
              {budget > 0 && (
                <span className="text-sm text-slate-500 font-medium">
                  of ₹{budget.toFixed(2)} budget
                </span>
              )}
            </div>
          </div>

          <div>
            {isEditingBudget ? (
              <form onSubmit={handleSaveBudget} className="flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="Set Budget (₹)"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-36 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  title="Save Budget"
                >
                  <Save size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBudget(false)}
                  className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition"
                >
                  <X size={16} />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsEditingBudget(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
              >
                <Edit2 size={14} />
                {budget > 0 ? 'Edit Budget' : '+ Set Trip Budget'}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {budget > 0 ? (
          <div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isOverBudget
                    ? 'bg-red-500'
                    : percentSpent > 75
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((totalSpent / budget) * 100, 100)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-xs font-medium mt-2">
              <span className={isOverBudget ? 'text-red-600 font-bold' : 'text-slate-500'}>
                {Math.round((totalSpent / budget) * 100)}% Spent
              </span>
              <span className={isOverBudget ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                {isOverBudget
                  ? `⚠️ Over Budget by ₹${(totalSpent - budget).toFixed(2)}`
                  : `₹${remaining.toFixed(2)} Remaining`}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 mt-2">
            No budget set yet. Click <strong>"+ Set Trip Budget"</strong> to set a spending limit for this trip!
          </p>
        )}
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Spend / Person</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{avgPerPerson.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">{memberCount} trip members</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bills Logged</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{expenses.length}</p>
          <p className="text-xs text-slate-500 mt-1">Tracked in PostgreSQL</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Category</p>
          <p className="text-xl font-bold text-slate-800 mt-1">
            {totalSpent === 0
              ? 'None yet'
              : Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0][0]}
          </p>
          <p className="text-xs text-slate-500 mt-1">Highest trip spending area</p>
        </div>
      </div>

      {/* 3. Category Breakdown & Member Contributions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Spending Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            📊 Spending by Category
          </h3>

          {totalSpent === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              Add some expenses to see category breakdowns!
            </p>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => {
                const amount = categoryTotals[cat.key] || 0
                const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0

                return (
                  <div key={cat.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span>{cat.icon}</span> {cat.label}
                      </span>
                      <span className="text-slate-900 font-bold">
                        ₹{amount.toFixed(2)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${cat.color} transition-all duration-300`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Member Spending Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            👥 Member Contributions (Who Paid)
          </h3>

          {totalSpent === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No payments logged yet.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(memberTotals).map(([mId, amount]) => {
                const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
                return (
                  <div key={mId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-800 font-semibold">{getMemberName(mId)}</span>
                      <span className="text-slate-900 font-bold">
                        ₹{amount.toFixed(2)} ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
