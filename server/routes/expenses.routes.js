import { Router } from 'express'
import {
  getExpenses,
  addExpense,
  deleteExpense,
  getSettlements,
  addSettlement,
} from '../controllers/expenses.controller.js'

const router = Router()

// Expenses
router.get('/:id/expenses', getExpenses)
router.post('/:id/expenses', addExpense)
router.delete('/:id/expenses/:expenseId', deleteExpense)

// Settlements
router.get('/:id/settlements', getSettlements)
router.post('/:id/settlements', addSettlement)

export default router
