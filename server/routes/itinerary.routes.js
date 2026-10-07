import { Router } from 'express'
import {
  getItinerary,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
} from '../controllers/itinerary.controller.js'

const router = Router()

router.get('/:id/itinerary', getItinerary)
router.post('/:id/itinerary', addItineraryItem)
router.put('/:id/itinerary/:itemId', updateItineraryItem)
router.delete('/:id/itinerary/:itemId', deleteItineraryItem)

export default router
