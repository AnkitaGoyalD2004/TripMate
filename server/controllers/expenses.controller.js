import { pool } from '../db.js'

// Get expenses for a trip
export async function getExpenses(req, res) {
  try {
    const expensesResult = await pool.query(
      'SELECT * FROM expenses WHERE trip_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    )

    const expenses = []
    for (const exp of expensesResult.rows) {
      const splitsResult = await pool.query(
        'SELECT user_id FROM expense_splits WHERE expense_id = $1',
        [exp.id]
      )
      expenses.push({
        id: exp.id.toString(),
        title: exp.title,
        amount: parseFloat(exp.amount),
        category: exp.category || 'Food',
        paidById: exp.paid_by_id.toString(),
        splitWithIds: splitsResult.rows.map((s) => s.user_id.toString()),
        receiptImage: exp.receipt_image,
        date: new Date(exp.created_at).toLocaleDateString(),
      })
    }

    res.json(expenses)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Add expense
export async function addExpense(req, res) {
  const { title, amount, category, paidById, splitWithIds, receiptImage } = req.body
  try {
    const expResult = await pool.query(
      'INSERT INTO expenses (trip_id, title, amount, category, paid_by_id, receipt_image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [req.params.id, title, amount, category || 'Food', paidById, receiptImage]
    )
    const exp = expResult.rows[0]

    for (const uId of splitWithIds) {
      await pool.query('INSERT INTO expense_splits (expense_id, user_id) VALUES ($1, $2)', [
        exp.id,
        uId,
      ])
    }

    res.json({
      id: exp.id.toString(),
      title: exp.title,
      amount: parseFloat(exp.amount),
      category: exp.category || category || 'Food',
      paidById: exp.paid_by_id.toString(),
      splitWithIds,
      receiptImage: exp.receipt_image,
      date: new Date(exp.created_at).toLocaleDateString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Delete expense
export async function deleteExpense(req, res) {
  try {
    await pool.query('DELETE FROM expenses WHERE id = $1', [req.params.expenseId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Get settlements for a trip
export async function getSettlements(req, res) {
  try {
    const result = await pool.query('SELECT * FROM settlements WHERE trip_id = $1', [
      req.params.id,
    ])
    res.json(
      result.rows.map((st) => ({
        id: st.id.toString(),
        fromId: st.from_user_id.toString(),
        toId: st.to_user_id.toString(),
        amount: parseFloat(st.amount),
        date: new Date(st.created_at).toLocaleDateString(),
      }))
    )
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Add settlement
export async function addSettlement(req, res) {
  const { fromId, toId, amount } = req.body
  try {
    const result = await pool.query(
      'INSERT INTO settlements (trip_id, from_user_id, to_user_id, amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.id, fromId, toId, amount]
    )
    const st = result.rows[0]
    res.json({
      id: st.id.toString(),
      fromId: st.from_user_id.toString(),
      toId: st.to_user_id.toString(),
      amount: parseFloat(st.amount),
      date: new Date(st.created_at).toLocaleDateString(),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
