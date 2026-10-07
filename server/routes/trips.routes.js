import { Router } from 'express'
import {
  getTrips,
  createTrip,
  updateBudget,
  joinTrip,
  deleteTrip,
  addMember,
  removeMember,
  updateMemberRole,
} from '../controllers/trips.controller.js'

const router = Router()

router.get('/', getTrips)
router.post('/', createTrip)
router.post('/join', joinTrip)
router.patch('/:id/budget', updateBudget)
router.delete('/:id', deleteTrip)

// Member squad routes
router.post('/:id/members', addMember)
router.delete('/:id/members/:userId', removeMember)
router.patch('/:id/members/:userId/role', updateMemberRole)

export default router
