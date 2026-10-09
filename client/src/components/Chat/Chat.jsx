import { useState, useEffect, useRef } from 'react'
import {
  Send,
  MessageSquare,
  Lightbulb,
  MapPin,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { io } from 'socket.io-client'
import { api } from '../../services/api.js'

export default function Chat({ tripId, currentUser }) {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedTag, setSelectedTag] = useState('General')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUser, setTypingUser] = useState(null)
  const [onlineMembers, setOnlineMembers] = useState([])

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // 1. Initialize WebSocket Connection & Load History on Mount
  useEffect(() => {
    if (!tripId) return

    // Load initial message history from database
    loadMessages()

    // Connect to WebSocket server
    const socket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setIsConnected(true)
      // Send user info for Redis squad presence tracking
      socket.emit('join_trip', {
        tripId,
        userId: currentUser?.id,
        userName: currentUser?.name || 'Member',
      })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      setOnlineMembers([])
    })

    // Listen for live squad presence updates from Redis
    socket.on('squad_presence', (members) => {
      setOnlineMembers(members || [])
    })

    // Listen for live messages received from any squad member
    socket.on('receive_message', (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate if already present
        if (prev.some((m) => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
    })

    // Listen for real-time typing indicators
    socket.on('user_typing', (userName) => {
      setTypingUser(userName)
    })

    socket.on('user_stop_typing', () => {
      setTypingUser(null)
    })

    // Cleanup on unmount or trip change
    return () => {
      socket.emit('leave_trip', {
        tripId,
        userId: currentUser?.id,
        userName: currentUser?.name || 'Member',
      })
      socket.disconnect()
    }
  }, [tripId, currentUser])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser])

  const loadMessages = async () => {
    setLoading(true)
    try {
      const data = await api.getMessages(tripId)
      if (Array.isArray(data)) {
        setMessages(data)
      }
    } catch (err) {
      console.error('Failed to load messages from database:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle typing indicator
  const handleInputChange = (e) => {
    setInputMessage(e.target.value)

    if (socketRef.current && isConnected) {
      socketRef.current.emit('typing', {
        tripId,
        userName: currentUser?.name || 'Someone',
      })

      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('stop_typing', { tripId })
        }
      }, 1500)
    }
  }

  // 2. Send Message via WebSocket (with REST fallback)
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || sending) return

    const text = inputMessage.trim()
    setInputMessage('')
    setSending(true)

    // Clear typing state
    if (socketRef.current) {
      socketRef.current.emit('stop_typing', { tripId })
    }

    try {
      if (socketRef.current && socketRef.current.connected) {
        // Send directly over WebSockets for instant broadcast!
        socketRef.current.emit('send_message', {
          tripId,
          userId: currentUser.id,
          message: text,
          tag: selectedTag,
        })
      } else {
        // Fallback to REST API if socket is temporarily disconnected
        const saved = await api.sendMessage(tripId, currentUser.id, text, selectedTag)
        setMessages((prev) => [...prev, saved])
      }
      setSelectedTag('General')
    } catch (err) {
      alert('Error sending message')
    } finally {
      setSending(false)
    }
  }

  // Tag configuration helper
  const getTagBadge = (tag) => {
    switch (tag) {
      case 'Idea':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <Lightbulb size={10} /> Idea
          </span>
        )
      case 'Recommendation':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            <MapPin size={10} /> Spot Reco
          </span>
        )
      case 'Urgent':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
            <AlertCircle size={10} /> Urgent
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[650px]">
      {/* 1. Header with WebSocket Live Status */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm">Trip Discussion Wall</h3>
              {/* Live WebSocket Status Badge */}
              <span
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isConnected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
                title={isConnected ? 'Connected via WebSockets' : 'Connecting to WebSockets...'}
              >
                {isConnected ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live WebSocket</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Connecting...</span>
                  </>
                )}
              </span>

              {/* Redis Live Squad Presence Badge */}
              {onlineMembers.length > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                  title={`Active now: ${onlineMembers.map((m) => m.userName).join(', ')}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  <span>
                    {onlineMembers.length} online
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Instant real-time chat & suggestions with trip companions
            </p>
          </div>
        </div>

        <button
          onClick={loadMessages}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          title="Reload History"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* 2. Message History Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 max-w-sm mx-auto text-slate-400">
            <MessageSquare size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600 text-sm">No messages yet!</p>
            <p className="text-xs text-slate-400 mt-1">
              Start the discussion! Share a hotel link, food recommendation, or trip idea with the group.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = String(msg.userId) === String(currentUser.id)

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-semibold text-slate-600">
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-[10px] text-slate-400">{msg.time}</span>
                  {getTagBadge(msg.tag)}
                </div>

                <div
                  className={`max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
              </div>
            )
          })
        )}

        {/* Real-time typing bubble */}
        {typingUser && (
          <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white px-3 py-1.5 rounded-full border border-slate-200 w-fit shadow-2xs">
            <span className="flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-200" />
            </span>
            <span>{typingUser} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input & Tag Selector Bar */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white space-y-3">
        {/* Quick Tag Selector */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium text-[11px]">Tag:</span>
          {[
            { key: 'General', label: '💬 General' },
            { key: 'Idea', label: '💡 Idea' },
            { key: 'Recommendation', label: '📍 Spot Reco' },
            { key: 'Urgent', label: '🚨 Urgent' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelectedTag(t.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                selectedTag === t.key
                  ? 'bg-indigo-50 text-indigo-600 font-bold border border-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Type a message or share an idea with friends..."
            value={inputMessage}
            onChange={handleInputChange}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || sending}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition shadow-xs"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
