import { Router } from 'express'
import {
  getLocations,
  addLocation,
  toggleLocationVisited,
  deleteLocation,
} from '../controllers/locations.controller.js'

const router = Router()

router.get('/:id/locations', getLocations)
router.post('/:id/locations', addLocation)
router.patch('/:id/locations/:locId/toggle', toggleLocationVisited)
router.delete('/:id/locations/:locId', deleteLocation)

export default router
