import { Router } from 'express'
import { getMessages, sendMessage } from '../controllers/chat.controller.js'

const router = Router()

router.get('/:id/messages', getMessages)
router.post('/:id/messages', sendMessage)

export default router
